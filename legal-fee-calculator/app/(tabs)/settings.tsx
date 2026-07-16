import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '@/components/dialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Badge,
  Button,
  Caption,
  Card,
  ChipGroup,
  Field,
  NumberInput,
  SectionTitle,
} from '@/components/ui';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { computeInternalRate } from '@/domain/engine';
import type { CatalogItem, CoefficientOption, Settings } from '@/domain/types';
import { useApp } from '@/store/AppStore';
import {
  backupToAppData,
  validateBackup,
} from '@/storage/backup';
import { exportBackupFile, pickBackupFile } from '@/storage/backupFile';
import { formatMoney } from '@/utils/format';
import { generateId } from '@/utils/id';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const app = useApp();
  const { settings } = app;
  const [busy, setBusy] = useState(false);

  const internalRate = useMemo(() => computeInternalRate(settings.finance), [settings.finance]);

  function patch(next: Partial<Settings>) {
    app.updateSettings({ ...settings, ...next });
  }
  function patchFinance(next: Partial<Settings['finance']>) {
    patch({ finance: { ...settings.finance, ...next } });
  }
  function patchThresholds(next: Partial<Settings['thresholds']>) {
    patch({ thresholds: { ...settings.thresholds, ...next } });
  }

  // --- Каталог ---
  function updateCatalogItem(id: string, p: Partial<CatalogItem>) {
    patch({ catalog: settings.catalog.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  }
  function addCatalogItem() {
    const maxOrder = settings.catalog.reduce((m, c) => Math.max(m, c.order), -1);
    const item: CatalogItem = {
      id: generateId('cat'),
      title: 'Новая услуга',
      price: 0,
      plannedHours: 0,
      unit: 'ед',
      archived: false,
      order: maxOrder + 1,
    };
    patch({ catalog: [...settings.catalog, item] });
  }
  function moveCatalog(id: string, dir: -1 | 1) {
    const sorted = [...settings.catalog].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swap];
    const ao = a.order;
    a.order = b.order;
    b.order = ao;
    patch({ catalog: sorted });
  }
  function deleteCatalog(id: string) {
    showAlert('Удалить услугу?', 'Позиция будет удалена из каталога. Старые расчёты не изменятся.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => patch({ catalog: settings.catalog.filter((c) => c.id !== id) }),
      },
    ]);
  }

  // --- Коэффициенты ---
  function updateCoef(
    field: 'complexityOptions' | 'urgencyOptions' | 'installmentOptions' | 'travelOptions',
    id: string,
    value: number
  ) {
    patch({
      [field]: settings[field].map((o: CoefficientOption) => (o.id === id ? { ...o, value } : o)),
    } as Partial<Settings>);
  }

  // --- Сброс ---
  function resetAll() {
    showAlert('Восстановить начальные значения?', 'Настройки, каталог и коэффициенты вернутся к исходным. Клиенты, дела и расчёты не изменятся.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Восстановить', style: 'destructive', onPress: () => app.resetSettings() },
    ]);
  }

  // --- Резервное копирование ---
  async function doExport() {
    try {
      setBusy(true);
      await exportBackupFile(app.buildBackupData());
    } catch (e) {
      showAlert('Не удалось создать копию', String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    try {
      setBusy(true);
      const raw = await pickBackupFile();
      if (raw == null) return; // отмена
      const check = validateBackup(raw);
      if (!check.ok) {
        showAlert('Файл не подходит', check.error);
        return;
      }
      const s = check.summary;
      const data = backupToAppData(check.data);
      showAlert(
        'Импорт данных',
        `В файле:\n• Клиентов: ${s.clients}\n• Дел: ${s.cases}\n• Расчётов: ${s.calculations}\n• Платежей: ${s.payments}\n\nПеред заменой будет создана автоматическая локальная копия текущих данных.`,
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Объединить',
            onPress: async () => {
              await app.importBackup(check.data, 'merge');
              showAlert('Готово', 'Данные объединены.');
            },
          },
          {
            text: 'Заменить',
            style: 'destructive',
            onPress: () => {
              showAlert('Полностью заменить?', 'Текущие данные будут заменены данными из файла.', [
                { text: 'Отмена', style: 'cancel' },
                {
                  text: 'Заменить',
                  style: 'destructive',
                  onPress: async () => {
                    await app.importBackup(check.data, 'replace');
                    showAlert('Готово', 'Данные заменены.');
                  },
                },
              ]);
            },
          },
        ]
      );
      void data;
    } catch (e) {
      showAlert('Ошибка импорта', String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  const sortedCatalog = [...settings.catalog].sort((a, b) => a.order - b.order);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl }]}
      keyboardShouldPersistTaps="handled"
    >
      <SectionTitle>Финансовая модель</SectionTitle>
      <Card>
        <Caption>Из этих значений автоматически считается внутренняя ставка за час.</Caption>
        <NumberInput label="Желаемый доход в месяц" value={settings.finance.desiredIncome} onChangeNumber={(n) => patchFinance({ desiredIncome: n })} suffix="₽" />
        <NumberInput label="Рабочих дней в неделю" value={settings.finance.workDaysPerWeek} onChangeNumber={(n) => patchFinance({ workDaysPerWeek: n })} />
        <NumberInput label="Оплачиваемых часов в день" mode="decimal" value={settings.finance.billableHoursPerDay} onChangeNumber={(n) => patchFinance({ billableHoursPerDay: n })} />
        <NumberInput label="Рабочих недель в год" value={settings.finance.workWeeksPerYear} onChangeNumber={(n) => patchFinance({ workWeeksPerYear: n })} />
        <NumberInput label="Рабочая ставка (нижняя граница)" value={settings.finance.baseHourlyRate} onChangeNumber={(n) => patchFinance({ baseHourlyRate: n })} suffix="₽/ч" />
        <ChipGroup
          label="Налог"
          options={[
            { key: 0.04, label: '4%' },
            { key: 0.06, label: '6%' },
          ]}
          value={settings.finance.taxRate}
          onChange={(v) => patchFinance({ taxRate: v })}
        />
        <View style={styles.rateBox}>
          <Text style={styles.rateLabel}>Применяемая ставка</Text>
          <Text style={styles.rateValue}>{formatMoney(internalRate)}/час</Text>
        </View>
      </Card>

      <SectionTitle>Постоянные расходы</SectionTitle>
      <Card>
        <NumberInput label="Аренда" value={settings.finance.rent} onChangeNumber={(n) => patchFinance({ rent: n })} suffix="₽" />
        <NumberInput label="Интернет" value={settings.finance.internet} onChangeNumber={(n) => patchFinance({ internet: n })} suffix="₽" />
        <NumberInput label="Канцелярия" value={settings.finance.stationery} onChangeNumber={(n) => patchFinance({ stationery: n })} suffix="₽" />
        <NumberInput label="ИИ-сервисы" value={settings.finance.aiServices} onChangeNumber={(n) => patchFinance({ aiServices: n })} suffix="₽" />
        <NumberInput label="Резерв" value={settings.finance.reserve} onChangeNumber={(n) => patchFinance({ reserve: n })} suffix="₽" />
      </Card>

      <SectionTitle>Пороги вознаграждения</SectionTitle>
      <Card>
        <NumberInput label="Порог обычного дела" value={settings.thresholds.normalCase} onChangeNumber={(n) => patchThresholds({ normalCase: n })} suffix="₽" />
        <NumberInput label="Порог медицинского дела" value={settings.thresholds.medicalCase} onChangeNumber={(n) => patchThresholds({ medicalCase: n })} suffix="₽" />
      </Card>

      <SectionTitle>Каталог услуг</SectionTitle>
      <Caption>Изменения не затрагивают уже сохранённые расчёты.</Caption>
      {sortedCatalog.map((item) => (
        <Card key={item.id} style={item.archived ? { opacity: 0.6 } : undefined}>
          <Field label="Название" value={item.title} onChangeText={(t) => updateCatalogItem(item.id, { title: t })} />
          <View style={styles.rowGap}>
            <View style={{ flex: 1 }}>
              <NumberInput label="Цена, ₽" value={item.price} onChangeNumber={(n) => updateCatalogItem(item.id, { price: n })} />
            </View>
            <View style={{ flex: 1 }}>
              <NumberInput label="Часы" mode="decimal" value={item.plannedHours} onChangeNumber={(n) => updateCatalogItem(item.id, { plannedHours: n })} />
            </View>
          </View>
          <Field label="Единица" value={item.unit} onChangeText={(t) => updateCatalogItem(item.id, { unit: t })} />
          <View style={styles.catalogActions}>
            <Pressable onPress={() => moveCatalog(item.id, -1)} style={styles.smallBtn}><Text style={styles.smallBtnText}>↑</Text></Pressable>
            <Pressable onPress={() => moveCatalog(item.id, 1)} style={styles.smallBtn}><Text style={styles.smallBtnText}>↓</Text></Pressable>
            <Pressable onPress={() => updateCatalogItem(item.id, { archived: !item.archived })} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>{item.archived ? 'Вернуть' : 'В архив'}</Text>
            </Pressable>
            <Pressable onPress={() => deleteCatalog(item.id)} style={styles.smallBtn}>
              <Text style={[styles.smallBtnText, { color: colors.danger }]}>Удалить</Text>
            </Pressable>
          </View>
        </Card>
      ))}
      <Button title="＋ Добавить услугу" variant="secondary" onPress={addCatalogItem} style={{ marginBottom: spacing.lg }} />

      <SectionTitle>Коэффициенты</SectionTitle>
      <CoefEditor title="Сложность" options={settings.complexityOptions} onChange={(id, v) => updateCoef('complexityOptions', id, v)} />
      <CoefEditor title="Срочность" options={settings.urgencyOptions} onChange={(id, v) => updateCoef('urgencyOptions', id, v)} />
      <CoefEditor title="Рассрочка" options={settings.installmentOptions} onChange={(id, v) => updateCoef('installmentOptions', id, v)} />
      <CoefEditor title="Оплата дороги" options={settings.travelOptions} onChange={(id, v) => updateCoef('travelOptions', id, v)} />

      <SectionTitle>Резервное копирование</SectionTitle>
      <Card>
        <Caption>Экспорт сохраняет все данные в один файл JSON. Импорт проверяет файл и показывает, сколько записей будет добавлено.</Caption>
        <Button title="Экспортировать данные" onPress={doExport} loading={busy} style={{ marginBottom: spacing.sm }} />
        <Button title="Импортировать данные" variant="secondary" onPress={doImport} loading={busy} />
      </Card>

      <SectionTitle>Сброс</SectionTitle>
      <Button title="Восстановить начальные значения" variant="danger" onPress={resetAll} />

      <View style={{ height: spacing.xl }} />
      <Text style={styles.version}>Схема данных: версия {settings.schemaVersion}</Text>
    </ScrollView>
  );
}

function CoefEditor({
  title,
  options,
  onChange,
}: {
  title: string;
  options: CoefficientOption[];
  onChange: (id: string, value: number) => void;
}) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Text style={styles.coefTitle}>{title}</Text>
        <Badge text={`${options.length} вар.`} />
      </View>
      {options.map((o) => (
        <View key={o.id} style={styles.coefRow}>
          <Text style={styles.coefLabel}>{o.label}</Text>
          <View style={{ width: 110 }}>
            <NumberInput label="" mode="decimal" value={o.value} onChangeNumber={(v) => onChange(o.id, v)} />
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  rowGap: { flexDirection: 'row', gap: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  rateBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  rateLabel: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  rateValue: { fontSize: fontSize.lg, color: colors.accent, fontWeight: '800' },
  catalogActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  smallBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  smallBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  coefTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  coefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  coefLabel: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  version: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
});

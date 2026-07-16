import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Badge,
  Button,
  Caption,
  Card,
  ChipGroup,
  Field,
  NumberInput,
  Row,
  SectionTitle,
  WarningBox,
} from '@/components/ui';
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  CLIENT_TYPE_LABELS,
  CLIENT_TYPE_OPTIONS,
  STAGE_LABELS,
  STAGE_OPTIONS,
} from '@/constants/labels';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { calculate, clampDiscount } from '@/domain/engine';
import { buildPaymentSchedule, buildProposalText } from '@/domain/selectors';
import type { CalcInput, CalcLine, CaseCategory, CaseStage, ClientType } from '@/domain/types';
import { useApp } from '@/store/AppStore';
import { formatHours, formatMoney } from '@/utils/format';
import { generateId } from '@/utils/id';

const STEPS = ['Клиент', 'Дело', 'Работы', 'Параметры', 'Результат'];

export default function NewCalcScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const app = useApp();
  const { settings } = app;

  const [step, setStep] = useState(0);

  // --- Шаг A: клиент ---
  const [clientMode, setClientMode] = useState<'existing' | 'new'>(
    app.clients.length > 0 ? 'existing' : 'new'
  );
  const [existingClientId, setExistingClientId] = useState<string | null>(null);
  const [ncType, setNcType] = useState<ClientType>('individual');
  const [ncName, setNcName] = useState('');
  const [ncPhone, setNcPhone] = useState('');
  const [ncInn, setNcInn] = useState('');
  const [ncNote, setNcNote] = useState('');

  // --- Шаг B: дело ---
  const [caseTitle, setCaseTitle] = useState('');
  const [category, setCategory] = useState<CaseCategory>('civil');
  const [stage, setStage] = useState<CaseStage>('first_instance');
  const [caseNote, setCaseNote] = useState('');
  const [startDate, setStartDate] = useState('');

  // --- Шаг C: работы ---
  const [lines, setLines] = useState<CalcLine[]>([]);

  // --- Шаг D: параметры ---
  const [extraLegalHours, setExtraLegalHours] = useState(0);
  const [travelHours, setTravelHours] = useState(0);
  const [travelId, setTravelId] = useState(settings.travelOptions[1]?.id ?? settings.travelOptions[0].id);
  const [directExpenses, setDirectExpenses] = useState(0);
  const [complexityId, setComplexityId] = useState(settings.complexityOptions[1]?.id ?? settings.complexityOptions[0].id);
  const [urgencyId, setUrgencyId] = useState(settings.urgencyOptions[0].id);
  const [installmentId, setInstallmentId] = useState(settings.installmentOptions[0].id);
  const [discount, setDiscount] = useState(0);
  const [manualEnabled, setManualEnabled] = useState(false);
  const [manualPrice, setManualPrice] = useState(0);
  const [manualReason, setManualReason] = useState('');

  const [schedule, setSchedule] = useState<number[] | null>(null);

  const activeCatalog = useMemo(
    () => settings.catalog.filter((c) => !c.archived).sort((a, b) => a.order - b.order),
    [settings.catalog]
  );

  const isMedical = category === 'medical';

  const coefVal = (list: { id: string; value: number }[], id: string) =>
    list.find((o) => o.id === id)?.value ?? 1;

  const input: CalcInput = useMemo(
    () => ({
      lines,
      extraLegalHours,
      travelHours,
      travelCoef: coefVal(settings.travelOptions, travelId),
      directExpenses,
      complexityCoef: coefVal(settings.complexityOptions, complexityId),
      urgencyCoef: coefVal(settings.urgencyOptions, urgencyId),
      installmentCoef: coefVal(settings.installmentOptions, installmentId),
      discountPercent: clampDiscount(discount),
      isMedical,
      manualPrice: manualEnabled ? manualPrice : null,
      manualPriceReason: manualEnabled ? manualReason : undefined,
    }),
    [
      lines,
      extraLegalHours,
      travelHours,
      travelId,
      directExpenses,
      complexityId,
      urgencyId,
      installmentId,
      discount,
      isMedical,
      manualEnabled,
      manualPrice,
      manualReason,
      settings,
    ]
  );

  const result = useMemo(
    () => calculate(input, settings.finance, settings.thresholds),
    [input, settings]
  );

  const selectedClientName = useMemo(() => {
    if (clientMode === 'existing') {
      return app.clients.find((c) => c.id === existingClientId)?.name ?? '';
    }
    return ncName;
  }, [clientMode, existingClientId, ncName, app.clients]);

  // --- Валидация шагов ---
  function canProceed(): { ok: boolean; message?: string } {
    if (step === 0) {
      if (clientMode === 'existing' && !existingClientId) {
        return { ok: false, message: 'Выберите клиента или создайте нового.' };
      }
      if (clientMode === 'new' && ncName.trim().length === 0) {
        return { ok: false, message: 'Укажите ФИО или название клиента.' };
      }
    }
    if (step === 1 && caseTitle.trim().length === 0) {
      return { ok: false, message: 'Укажите название дела.' };
    }
    if (step === 2 && lines.length === 0) {
      return { ok: false, message: 'Добавьте хотя бы одну работу.' };
    }
    if (step === 3 && manualEnabled && manualReason.trim().length === 0) {
      return { ok: false, message: 'Укажите причину ручной цены.' };
    }
    return { ok: true };
  }

  function next() {
    const check = canProceed();
    if (!check.ok) {
      Alert.alert('Проверьте данные', check.message);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  // --- Работа с позициями ---
  function addCatalogLine(itemId: string) {
    const item = settings.catalog.find((c) => c.id === itemId);
    if (!item) return;
    const line: CalcLine = {
      id: generateId('line'),
      catalogItemId: item.id,
      title: item.title,
      quantity: 1,
      unit: item.unit,
      unitPrice: item.price,
      hoursPerUnit: item.plannedHours,
    };
    setLines((prev) => [...prev, line]);
  }

  function addCustomLine() {
    setLines((prev) => [
      ...prev,
      {
        id: generateId('line'),
        title: 'Произвольная работа',
        quantity: 1,
        unit: 'ед',
        unitPrice: 0,
        hoursPerUnit: 0,
      },
    ]);
  }

  function updateLine(id: string, patch: Partial<CalcLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  // --- Сохранение ---
  async function handleSave() {
    if (manualEnabled && manualReason.trim().length === 0) {
      Alert.alert('Укажите причину', 'Для ручной цены нужно текстовое пояснение.');
      return;
    }
    if (result.warnings.length > 0 && !manualEnabled && discount === 0) {
      // Цена ниже порога из-за самого состава — просто предупредим, но не блокируем
    }

    let clientId = existingClientId;
    if (clientMode === 'new') {
      const created = await app.addClient({
        type: ncType,
        name: ncName.trim(),
        phone: ncPhone.trim() || undefined,
        inn: ncInn.trim() || undefined,
        note: ncNote.trim() || undefined,
      });
      clientId = created.id;
    }
    if (!clientId) return;

    const createdCase = await app.addCase({
      clientId,
      title: caseTitle.trim(),
      category,
      stage,
      note: caseNote.trim() || undefined,
      startDate: startDate.trim() || undefined,
      status: 'proposal',
      plannedHours: result.legalHours,
      actualHours: 0,
      contractPrice: result.finalPrice,
    });

    await app.addCalculation({ clientId, caseId: createdCase.id, input });

    Alert.alert('Готово', 'Расчёт сохранён.', [
      { text: 'К списку клиентов', onPress: () => router.replace('/clients') },
      { text: 'На главную', onPress: () => router.replace('/'), style: 'cancel' },
    ]);
  }

  async function copyProposal() {
    const text = buildProposalText({
      clientName: selectedClientName,
      caseTitle,
      category,
      stage,
      result,
      lines: lines.map((l) => ({ title: l.title, quantity: l.quantity, unit: l.unit })),
    });
    await Clipboard.setStringAsync(text);
    Alert.alert('Скопировано', 'Текст предложения скопирован в буфер обмена.');
  }

  function makeSchedule() {
    const months = installmentId === settings.installmentOptions[2]?.id ? 3
      : installmentId === settings.installmentOptions[1]?.id ? 2 : 1;
    setSchedule(buildPaymentSchedule(result.finalPrice, months));
  }

  const warningMessages = result.warnings.map((w) => w.message);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StepIndicator step={step} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <StepClient
            mode={clientMode}
            setMode={setClientMode}
            clients={app.clients.filter((c) => !c.archived)}
            existingClientId={existingClientId}
            setExistingClientId={setExistingClientId}
            ncType={ncType}
            setNcType={setNcType}
            ncName={ncName}
            setNcName={setNcName}
            ncPhone={ncPhone}
            setNcPhone={setNcPhone}
            ncInn={ncInn}
            setNcInn={setNcInn}
            ncNote={ncNote}
            setNcNote={setNcNote}
          />
        )}

        {step === 1 && (
          <View>
            <SectionTitle>Дело</SectionTitle>
            <Field label="Название дела" value={caseTitle} onChangeText={setCaseTitle} placeholder="Например: спор с клиникой" />
            <ChipGroup
              label="Категория"
              options={CATEGORY_OPTIONS.map((c) => ({ key: c, label: CATEGORY_LABELS[c] }))}
              value={category}
              onChange={setCategory}
            />
            <ChipGroup
              label="Стадия"
              options={STAGE_OPTIONS.map((c) => ({ key: c, label: STAGE_LABELS[c] }))}
              value={stage}
              onChange={setStage}
            />
            <Field label="Краткая заметка (необязательно)" value={caseNote} onChangeText={setCaseNote} multiline placeholder="Нейтральное описание" />
            <Field label="Предполагаемая дата начала (ДД.ММ.ГГГГ)" value={startDate} onChangeText={setStartDate} placeholder="16.07.2026" />
          </View>
        )}

        {step === 2 && (
          <StepWorks
            catalog={activeCatalog}
            lines={lines}
            onAddCatalog={addCatalogLine}
            onAddCustom={addCustomLine}
            onUpdate={updateLine}
            onRemove={removeLine}
            catalogCost={result.catalogCost}
            legalHours={result.legalHours}
          />
        )}

        {step === 3 && (
          <StepParams
            settings={settings}
            extraLegalHours={extraLegalHours}
            setExtraLegalHours={setExtraLegalHours}
            travelHours={travelHours}
            setTravelHours={setTravelHours}
            travelId={travelId}
            setTravelId={setTravelId}
            directExpenses={directExpenses}
            setDirectExpenses={setDirectExpenses}
            complexityId={complexityId}
            setComplexityId={setComplexityId}
            urgencyId={urgencyId}
            setUrgencyId={setUrgencyId}
            installmentId={installmentId}
            setInstallmentId={setInstallmentId}
            discount={discount}
            setDiscount={setDiscount}
            manualEnabled={manualEnabled}
            setManualEnabled={setManualEnabled}
            manualPrice={manualPrice}
            setManualPrice={setManualPrice}
            manualReason={manualReason}
            setManualReason={setManualReason}
          />
        )}

        {step === 4 && (
          <StepResult
            result={result}
            input={input}
            warningMessages={warningMessages}
            onSave={handleSave}
            onCopy={copyProposal}
            onSchedule={makeSchedule}
            schedule={schedule}
            onManualToggle={() => {
              setManualEnabled(true);
              setStep(3);
            }}
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom || spacing.md }]}>
        {step > 0 ? (
          <Button title="Назад" variant="secondary" onPress={back} style={{ flex: 1 }} />
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {step < STEPS.length - 1 ? (
          <Button title="Далее" onPress={next} style={{ flex: 1 }} />
        ) : (
          <Button title="Сохранить расчёт" variant="accent" onPress={handleSave} style={{ flex: 1 }} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function StepIndicator({ step }: { step: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.stepBar, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.stepTitle}>
        Шаг {step + 1} из {STEPS.length}: {STEPS[step]}
      </Text>
      <View style={styles.stepDots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.stepDot, i <= step && styles.stepDotActive]} />
        ))}
      </View>
    </View>
  );
}

function StepClient(props: {
  mode: 'existing' | 'new';
  setMode: (m: 'existing' | 'new') => void;
  clients: { id: string; name: string }[];
  existingClientId: string | null;
  setExistingClientId: (id: string) => void;
  ncType: ClientType;
  setNcType: (t: ClientType) => void;
  ncName: string;
  setNcName: (v: string) => void;
  ncPhone: string;
  setNcPhone: (v: string) => void;
  ncInn: string;
  setNcInn: (v: string) => void;
  ncNote: string;
  setNcNote: (v: string) => void;
}) {
  return (
    <View>
      <SectionTitle>Клиент</SectionTitle>
      <ChipGroup
        options={[
          { key: 'existing', label: 'Существующий' },
          { key: 'new', label: 'Новый' },
        ]}
        value={props.mode}
        onChange={props.setMode}
      />
      {props.mode === 'existing' ? (
        props.clients.length === 0 ? (
          <Caption>Пока нет сохранённых клиентов. Переключитесь на «Новый».</Caption>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {props.clients.map((c) => {
              const active = c.id === props.existingClientId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => props.setExistingClientId(c.id)}
                  style={[styles.selectRow, active && styles.selectRowActive]}
                >
                  <Text style={[styles.selectText, active && { color: colors.white }]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>
        )
      ) : (
        <View>
          <ChipGroup
            label="Тип клиента"
            options={CLIENT_TYPE_OPTIONS.map((t) => ({ key: t, label: CLIENT_TYPE_LABELS[t] }))}
            value={props.ncType}
            onChange={props.setNcType}
          />
          <Field label="ФИО или название" value={props.ncName} onChangeText={props.setNcName} placeholder="Иванов Иван Иванович" />
          <Field label="Телефон (необязательно)" value={props.ncPhone} onChangeText={props.setNcPhone} keyboardType="phone-pad" placeholder="+7 900 000-00-00" />
          <Field label="ИНН (необязательно)" value={props.ncInn} onChangeText={props.setNcInn} keyboardType="number-pad" />
          <Field label="Заметка (необязательно)" value={props.ncNote} onChangeText={props.setNcNote} multiline />
        </View>
      )}
    </View>
  );
}

function StepWorks(props: {
  catalog: { id: string; title: string; price: number; unit: string }[];
  lines: CalcLine[];
  onAddCatalog: (id: string) => void;
  onAddCustom: () => void;
  onUpdate: (id: string, patch: Partial<CalcLine>) => void;
  onRemove: (id: string) => void;
  catalogCost: number;
  legalHours: number;
}) {
  return (
    <View>
      <SectionTitle>Состав работ</SectionTitle>
      <Caption>Выберите позиции из каталога. Цену и часы можно изменить только в этом расчёте — каталог не меняется.</Caption>

      {props.lines.map((line) => (
        <Card key={line.id}>
          <Field label="Название" value={line.title} onChangeText={(t) => props.onUpdate(line.id, { title: t })} />
          <View style={styles.lineRow}>
            <View style={{ flex: 1 }}>
              <NumberInput label="Количество" value={line.quantity} onChangeNumber={(n) => props.onUpdate(line.id, { quantity: n })} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Единица" value={line.unit} onChangeText={(t) => props.onUpdate(line.id, { unit: t })} />
            </View>
          </View>
          <View style={styles.lineRow}>
            <View style={{ flex: 1 }}>
              <NumberInput label="Цена за ед., ₽" value={line.unitPrice} onChangeNumber={(n) => props.onUpdate(line.id, { unitPrice: n })} />
            </View>
            <View style={{ flex: 1 }}>
              <NumberInput label="Часы за ед." mode="decimal" value={line.hoursPerUnit} onChangeNumber={(n) => props.onUpdate(line.id, { hoursPerUnit: n })} />
            </View>
          </View>
          <Row label="Сумма позиции" value={formatMoney(line.unitPrice * line.quantity)} strong />
          <Pressable onPress={() => props.onRemove(line.id)} style={styles.removeBtn}>
            <Text style={styles.removeText}>Удалить позицию</Text>
          </Pressable>
        </Card>
      ))}

      <SectionTitle>Добавить из каталога</SectionTitle>
      <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
        {props.catalog.map((item) => (
          <Pressable key={item.id} onPress={() => props.onAddCatalog(item.id)} style={styles.catalogRow}>
            <Text style={styles.catalogTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.catalogRight}>
              <Text style={styles.catalogPrice}>{formatMoney(item.price)}</Text>
              <Text style={styles.catalogAdd}>＋ добавить</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <Button title="＋ Произвольная работа" variant="secondary" onPress={props.onAddCustom} />

      <Card style={{ marginTop: spacing.md }}>
        <Row label="Каталожная стоимость" value={formatMoney(props.catalogCost)} strong />
        <Row label="Плановые часы" value={formatHours(props.legalHours)} />
      </Card>
    </View>
  );
}

function StepParams(props: any) {
  const s = props.settings;
  return (
    <View>
      <SectionTitle>Дополнительные параметры</SectionTitle>
      <Card>
        <NumberInput label="Дополнительные юридические часы" mode="decimal" value={props.extraLegalHours} onChangeNumber={props.setExtraLegalHours} suffix="ч" />
        <NumberInput label="Время в дороге" mode="decimal" value={props.travelHours} onChangeNumber={props.setTravelHours} suffix="ч" />
        <ChipGroup
          label="Оплата времени в дороге"
          options={s.travelOptions.map((o: any) => ({ key: o.id, label: o.label }))}
          value={props.travelId}
          onChange={props.setTravelId}
        />
        <NumberInput label="Прямые расходы (билеты, гостиница, госпошлина и пр.)" value={props.directExpenses} onChangeNumber={props.setDirectExpenses} suffix="₽" />
      </Card>

      <Card>
        <ChipGroup
          label="Сложность"
          options={s.complexityOptions.map((o: any) => ({ key: o.id, label: `${o.label} ×${o.value}` }))}
          value={props.complexityId}
          onChange={props.setComplexityId}
        />
        <ChipGroup
          label="Срочность"
          options={s.urgencyOptions.map((o: any) => ({ key: o.id, label: `${o.label} ×${o.value}` }))}
          value={props.urgencyId}
          onChange={props.setUrgencyId}
        />
        <ChipGroup
          label="Рассрочка"
          options={s.installmentOptions.map((o: any) => ({ key: o.id, label: `${o.label} ×${o.value}` }))}
          value={props.installmentId}
          onChange={props.setInstallmentId}
        />
        <NumberInput label="Скидка, % (0–20)" value={props.discount} onChangeNumber={(n: number) => props.setDiscount(clampDiscount(n))} suffix="%" />
      </Card>

      <Card>
        <ChipGroup
          label="Ручная итоговая цена"
          options={[
            { key: 'off', label: 'Авто' },
            { key: 'on', label: 'Вручную' },
          ]}
          value={props.manualEnabled ? 'on' : 'off'}
          onChange={(v) => props.setManualEnabled(v === 'on')}
        />
        {props.manualEnabled ? (
          <View>
            <NumberInput label="Итоговая цена, ₽" value={props.manualPrice} onChangeNumber={props.setManualPrice} suffix="₽" />
            <Field label="Причина ручной цены (обязательно)" value={props.manualReason} onChangeText={props.setManualReason} multiline placeholder="Например: постоянный клиент, льготная цена" />
          </View>
        ) : null}
      </Card>
    </View>
  );
}

function StepResult(props: any) {
  const r = props.result;
  return (
    <View>
      <SectionTitle>Результат</SectionTitle>

      <View style={styles.bigGrid}>
        <BigValue label="Стоимость по каталогу" value={formatMoney(r.catalogCost)} />
        <BigValue label="Экономический минимум" value={formatMoney(r.economicMinimum)} />
      </View>
      <View style={styles.bigGrid}>
        <BigValue label="Рекомендуемая цена" value={formatMoney(r.recommendedPrice)} />
        <BigValue label="Итоговая цена" value={formatMoney(r.finalPrice)} highlight />
      </View>

      <WarningBox messages={props.warningMessages} />

      <Card>
        <SectionTitle>Как получилась цена</SectionTitle>
        <Row label="Юридические часы" value={formatHours(r.legalHours)} />
        <Row label="Оплачиваемые дорожные часы" value={formatHours(r.billableTravelHours)} />
        <Row label="Внутренняя ставка" value={`${formatMoney(r.internalRate)}/час`} />
        <Row label="Стоимость времени" value={formatMoney(r.timeCost)} />
        <Row label="База вознаграждения" value={formatMoney(r.feeBase)} />
        <Row label="Вознаграждение до скидки" value={formatMoney(r.feeBeforeDiscount)} />
        {props.input.discountPercent > 0 ? (
          <Row label={`Скидка ${props.input.discountPercent}%`} value={`− ${formatMoney(r.feeBeforeDiscount - r.feeAfterDiscount)}`} />
        ) : null}
        <Row label="Вознаграждение после скидки" value={formatMoney(r.feeAfterDiscount)} />
        {r.directExpenses > 0 ? (
          <Row label="Прямые расходы (без скидки)" value={formatMoney(r.directExpenses)} />
        ) : null}
        <Row label="Итоговая цена для клиента" value={formatMoney(r.finalPrice)} strong />
        {r.isManual ? <Badge text="Цена задана вручную" bg={colors.warningSoft} color={colors.warning} /> : null}
      </Card>

      {props.schedule ? (
        <Card>
          <SectionTitle>График платежей</SectionTitle>
          {props.schedule.map((amount: number, i: number) => (
            <Row key={i} label={`Платёж ${i + 1}`} value={formatMoney(amount)} />
          ))}
        </Card>
      ) : null}

      <Button title="Скопировать предложение" variant="secondary" onPress={props.onCopy} style={{ marginBottom: spacing.sm }} />
      <Button title="Создать график платежей" variant="secondary" onPress={props.onSchedule} style={{ marginBottom: spacing.sm }} />
      <Button title="Изменить итоговую цену" variant="ghost" onPress={props.onManualToggle} />
    </View>
  );
}

function BigValue({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.bigValue, highlight && styles.bigValueHi]}>
      <Text style={styles.bigLabel}>{label}</Text>
      <Text style={[styles.bigNumber, highlight && { color: colors.accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  stepBar: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  stepDots: { flexDirection: 'row', gap: spacing.xs },
  stepDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  stepDotActive: { backgroundColor: colors.accent },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectRow: {
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectRowActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectText: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  lineRow: { flexDirection: 'row', gap: spacing.md },
  removeBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  removeText: { color: colors.danger, fontWeight: '600', fontSize: fontSize.sm },
  catalogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  catalogTitle: { flex: 1, fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  catalogRight: { alignItems: 'flex-end' },
  catalogPrice: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  catalogAdd: { fontSize: fontSize.xs, color: colors.accent, fontWeight: '600', marginTop: 2 },
  bigGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  bigValue: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  bigValueHi: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  bigLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  bigNumber: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary, marginTop: spacing.xs },
});

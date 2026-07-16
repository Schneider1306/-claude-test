import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, EmptyState, Row, SectionTitle, WarningBox } from '@/components/ui';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/constants/labels';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { buildProposalText } from '@/domain/selectors';
import { useApp } from '@/store/AppStore';
import { formatDateTime, formatHours, formatMoney } from '@/utils/format';

export default function CalculationDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const calc = app.calculations.find((c) => c.id === id);

  if (!calc) {
    return (
      <View style={[styles.screen, styles.center]}>
        <EmptyState title="Расчёт не найден" />
      </View>
    );
  }

  const r = calc.result;
  const warningMessages = r.warnings.map((w) => w.message);

  async function copy() {
    const text = buildProposalText({
      clientName: calc!.clientName,
      caseTitle: calc!.caseTitle,
      category: calc!.category,
      result: r,
      lines: calc!.input.lines.map((l) => ({ title: l.title, quantity: l.quantity, unit: l.unit })),
    });
    await Clipboard.setStringAsync(text);
    Alert.alert('Скопировано', 'Текст предложения скопирован в буфер обмена.');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.headRow}>
        <Text style={styles.title}>{calc.caseTitle || CATEGORY_LABELS[calc.category]}</Text>
        <Badge text={`Версия ${calc.version}`} />
      </View>
      <Text style={styles.meta}>{calc.clientName || 'Без клиента'} · {formatDateTime(calc.createdAt)}</Text>
      <Text style={styles.snapshot}>Это неизменяемый снимок расчёта. Он не меняется при изменении каталога и настроек.</Text>

      <View style={styles.bigGrid}>
        <Big label="По каталогу" value={formatMoney(r.catalogCost)} />
        <Big label="Экон. минимум" value={formatMoney(r.economicMinimum)} />
      </View>
      <View style={styles.bigGrid}>
        <Big label="Рекомендуемая" value={formatMoney(r.recommendedPrice)} />
        <Big label="Итоговая" value={formatMoney(r.finalPrice)} highlight />
      </View>

      <WarningBox messages={warningMessages} />

      <SectionTitle>Состав работ</SectionTitle>
      <Card>
        {calc.input.lines.map((l) => (
          <Row key={l.id} label={`${l.title} · ${l.quantity} ${l.unit}`} value={formatMoney(l.unitPrice * l.quantity)} />
        ))}
      </Card>

      <SectionTitle>Расшифровка</SectionTitle>
      <Card>
        <Row label="Статус дела" value={STATUS_LABELS[calc.status]} />
        <Row label="Юридические часы" value={formatHours(r.legalHours)} />
        <Row label="Дорожные часы (оплач.)" value={formatHours(r.billableTravelHours)} />
        <Row label="Внутренняя ставка" value={`${formatMoney(r.internalRate)}/час`} />
        <Row label="Стоимость времени" value={formatMoney(r.timeCost)} />
        <Row label="База вознаграждения" value={formatMoney(r.feeBase)} />
        <Row label="До скидки" value={formatMoney(r.feeBeforeDiscount)} />
        {calc.input.discountPercent > 0 ? <Row label={`Скидка ${calc.input.discountPercent}%`} value={`− ${formatMoney(r.feeBeforeDiscount - r.feeAfterDiscount)}`} /> : null}
        <Row label="После скидки" value={formatMoney(r.feeAfterDiscount)} />
        {r.directExpenses > 0 ? <Row label="Прямые расходы" value={formatMoney(r.directExpenses)} /> : null}
        <Row label="Итоговая цена" value={formatMoney(r.finalPrice)} strong />
        {r.isManual ? <Badge text="Цена задана вручную" bg={colors.warningSoft} color={colors.warning} /> : null}
      </Card>

      {calc.input.manualPriceReason ? (
        <Card>
          <SectionTitle>Причина ручной цены</SectionTitle>
          <Text style={styles.reason}>{calc.input.manualPriceReason}</Text>
        </Card>
      ) : null}

      <Button title="Скопировать предложение" onPress={copy} style={{ marginTop: spacing.sm }} />
      <Button title="Открыть дело" variant="secondary" onPress={() => router.push(`/case/${calc.caseId}`)} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

function Big({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.big, highlight && styles.bigHi]}>
      <Text style={styles.bigLabel}>{label}</Text>
      <Text style={[styles.bigValue, highlight && { color: colors.accent }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, flex: 1 },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  snapshot: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md, fontStyle: 'italic' },
  bigGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  big: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  bigHi: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  bigLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  bigValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary, marginTop: spacing.xs },
  reason: { fontSize: fontSize.md, color: colors.text },
});

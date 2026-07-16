import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, EmptyState, Row, SectionTitle } from '@/components/ui';
import {
  CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  STAGE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
} from '@/constants/labels';
import { colors, fontSize, spacing } from '@/constants/theme';
import { caseFinance } from '@/domain/selectors';
import { useApp } from '@/store/AppStore';
import { formatDate, formatDateTime, formatHours, formatMoney } from '@/utils/format';

export default function CaseDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const legalCase = app.cases.find((c) => c.id === id);
  const client = app.clients.find((c) => c.id === legalCase?.clientId);

  const calcs = useMemo(() => app.calculations.filter((c) => c.caseId === id), [app.calculations, id]);
  const pays = useMemo(
    () => app.payments.filter((p) => p.caseId === id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [app.payments, id]
  );

  if (!legalCase) {
    return (
      <View style={[styles.screen, styles.center]}>
        <EmptyState title="Дело не найдено" />
      </View>
    );
  }

  const fin = caseFinance(legalCase, app.payments);
  const st = STATUS_COLORS[legalCase.status];

  function remove() {
    const hasHistory = calcs.length > 0 || pays.length > 0;
    Alert.alert(
      'Удалить дело?',
      hasHistory
        ? 'У дела есть расчёты и платежи. Их можно сохранить, архивировав дело, либо удалить всё вместе.'
        : 'Дело будет удалено.',
      hasHistory
        ? [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Архивировать', onPress: () => app.setCaseArchived(legalCase!.id, true) },
            {
              text: 'Удалить всё',
              style: 'destructive',
              onPress: async () => {
                await app.deleteCase(legalCase!.id, true);
                router.back();
              },
            },
          ]
        : [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Удалить',
              style: 'destructive',
              onPress: async () => {
                await app.deleteCase(legalCase!.id, false);
                router.back();
              },
            },
          ]
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.headRow}>
        <Text style={styles.title}>{legalCase.title}</Text>
        <Badge text={STATUS_LABELS[legalCase.status]} bg={st.bg} color={st.color} />
      </View>

      <Card>
        <Row label="Клиент" value={client?.name ?? '—'} />
        <Row label="Категория" value={CATEGORY_LABELS[legalCase.category]} />
        <Row label="Стадия" value={STAGE_LABELS[legalCase.stage]} />
        {legalCase.startDate ? <Row label="Дата начала" value={formatDate(legalCase.startDate)} /> : null}
        {legalCase.note ? <Row label="Заметка" value={legalCase.note} /> : null}
      </Card>

      <Card>
        <Row label="Плановые часы" value={formatHours(legalCase.plannedHours)} />
        <Row label="Фактические часы" value={formatHours(legalCase.actualHours)} />
        <Row label="Договорная цена" value={formatMoney(fin.price)} strong />
        <Row label="Оплачено" value={formatMoney(fin.paid)} color={colors.success} />
        <Row label="Остаток" value={formatMoney(fin.remaining)} strong color={fin.remaining > 0 ? colors.primary : colors.success} />
      </Card>

      <View style={styles.btnRow}>
        <Button title="Изменить" variant="secondary" onPress={() => router.push(`/case/edit?id=${legalCase.id}`)} style={{ flex: 1 }} />
        <Button title="＋ Платёж" variant="accent" onPress={() => router.push(`/payment/new?caseId=${legalCase.id}`)} style={{ flex: 1 }} />
      </View>

      <SectionTitle>Платежи</SectionTitle>
      {pays.length === 0 ? (
        <Card><EmptyState title="Платежей пока нет" /></Card>
      ) : (
        pays.map((p) => (
          <Card key={p.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.payAmount}>{formatMoney(p.amount)}</Text>
              <Text style={styles.meta}>{formatDate(p.date)}</Text>
            </View>
            <Text style={styles.meta}>{PAYMENT_METHOD_LABELS[p.method]}{p.comment ? ` · ${p.comment}` : ''}</Text>
            <Pressable onPress={() => app.deletePayment(p.id)} style={styles.deleteRow}>
              <Text style={styles.deleteText}>Удалить платёж</Text>
            </Pressable>
          </Card>
        ))
      )}

      <SectionTitle>Расчёты</SectionTitle>
      {calcs.length === 0 ? (
        <Card><EmptyState title="Расчётов пока нет" /></Card>
      ) : (
        calcs.map((calc) => (
          <Pressable key={calc.id} onPress={() => router.push(`/calculation/${calc.id}`)}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.caseTitle}>Версия {calc.version}</Text>
                <Text style={styles.price}>{formatMoney(calc.result.finalPrice)}</Text>
              </View>
              <Text style={styles.meta}>{formatDateTime(calc.createdAt)}</Text>
            </Card>
          </Pressable>
        ))
      )}

      <View style={{ height: spacing.lg }} />
      <Button title="Удалить дело" variant="danger" onPress={remove} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, flex: 1 },
  btnRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  caseTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
  payAmount: { fontSize: fontSize.md, fontWeight: '800', color: colors.success },
  price: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  deleteRow: { paddingTop: spacing.sm },
  deleteText: { color: colors.danger, fontWeight: '600', fontSize: fontSize.sm },
});

import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Caption, Card, EmptyState, SectionTitle } from '@/components/ui';
import { CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from '@/constants/labels';
import { colors, fontSize, spacing } from '@/constants/theme';
import { dashboardStats } from '@/domain/selectors';
import { useApp } from '@/store/AppStore';
import { formatDateTime, formatMoney } from '@/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clients, cases, calculations, payments, loading } = useApp();

  const stats = useMemo(
    () => dashboardStats({ clients, cases, calculations, payments }),
    [clients, cases, calculations, payments]
  );

  const recent = useMemo(() => calculations.slice(0, 5), [calculations]);
  const lowPriceExists = useMemo(
    () => calculations.some((c) => c.result.warnings.length > 0),
    [calculations]
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.appTitle}>Стоимость юруслуг</Text>
      <Caption>Помощник по расчёту цены — Илья Воронов</Caption>

      <Button
        title="＋  Новый расчёт"
        variant="accent"
        onPress={() => router.push('/new')}
        style={{ marginBottom: spacing.lg }}
      />

      {lowPriceExists ? (
        <View style={styles.alert}>
          <Text style={styles.alertText}>
            ⚠ Есть расчёты с ценой ниже экономического минимума или порога. Проверьте историю.
          </Text>
        </View>
      ) : null}

      <View style={styles.statGrid}>
        <StatTile label="Клиентов" value={String(stats.clientsCount)} />
        <StatTile label="Активных дел" value={String(stats.activeCasesCount)} />
      </View>
      <View style={styles.statGrid}>
        <StatTile label="Предложения за месяц" value={formatMoney(stats.proposalsThisMonth)} />
        <StatTile label="Получено за месяц" value={formatMoney(stats.paymentsThisMonth)} accent />
      </View>

      <SectionTitle>Последние расчёты</SectionTitle>
      {loading ? (
        <Card>
          <Caption>Загрузка…</Caption>
        </Card>
      ) : recent.length === 0 ? (
        <Card>
          <EmptyState
            title="Пока нет расчётов"
            subtitle="Нажмите «Новый расчёт», чтобы посчитать стоимость услуг."
          />
        </Card>
      ) : (
        recent.map((calc) => {
          const st = STATUS_COLORS[calc.status];
          return (
            <Pressable key={calc.id} onPress={() => router.push(`/calculation/${calc.id}`)}>
              <Card>
                <View style={styles.recentHeader}>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {calc.caseTitle || CATEGORY_LABELS[calc.category]}
                  </Text>
                  <Text style={styles.recentPrice}>{formatMoney(calc.result.finalPrice)}</Text>
                </View>
                <Text style={styles.recentClient} numberOfLines={1}>
                  {calc.clientName || 'Без клиента'} · {formatDateTime(calc.createdAt)}
                </Text>
                <View style={styles.recentFooter}>
                  <Badge text={STATUS_LABELS[calc.status]} bg={st.bg} color={st.color} />
                  {calc.result.warnings.length > 0 ? (
                    <Badge text="Ниже минимума" bg={colors.dangerSoft} color={colors.danger} />
                  ) : null}
                </View>
              </Card>
            </Pressable>
          );
        })
      )}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

function StatTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statTile, accent && styles.statTileAccent]}>
      <Text style={[styles.statValue, accent && { color: colors.accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  appTitle: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  statGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  statTileAccent: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
  statValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  recentTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
  recentPrice: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
  recentClient: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  recentFooter: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  alert: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  alertText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '600' },
});

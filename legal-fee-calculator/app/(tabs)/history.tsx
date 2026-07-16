import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Card, ChipGroup, EmptyState, SectionTitle } from '@/components/ui';
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from '@/constants/labels';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useApp } from '@/store/AppStore';
import { formatDateTime, formatMoney, isInCurrentMonth } from '@/utils/format';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { calculations, payments } = useApp();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | (typeof CATEGORY_OPTIONS)[number]>('all');
  const [status, setStatus] = useState<'all' | (typeof STATUS_OPTIONS)[number]>('all');
  const [period, setPeriod] = useState<'all' | 'month'>('all');
  const [tab, setTab] = useState<'calc' | 'pay'>('calc');

  const filteredCalcs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return calculations.filter((c) => {
      if (q && !c.clientName.toLowerCase().includes(q) && !c.caseTitle.toLowerCase().includes(q)) return false;
      if (category !== 'all' && c.category !== category) return false;
      if (status !== 'all' && c.status !== status) return false;
      if (period === 'month' && !isInCurrentMonth(c.createdAt)) return false;
      return true;
    });
  }, [calculations, query, category, status, period]);

  const totals = useMemo(() => {
    const price = filteredCalcs.reduce((s, c) => s + c.result.finalPrice, 0);
    return { price, count: filteredCalcs.length };
  }, [filteredCalcs]);

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [payments]
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      keyboardShouldPersistTaps="handled"
    >
      <SectionTitle>История</SectionTitle>

      <ChipGroup
        options={[
          { key: 'calc', label: 'Расчёты' },
          { key: 'pay', label: 'Платежи' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'calc' ? (
        <View>
          <TextInput
            style={styles.search}
            placeholder="Поиск по клиенту или делу"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          <ChipGroup
            label="Категория"
            options={[{ key: 'all', label: 'Все' }, ...CATEGORY_OPTIONS.map((c) => ({ key: c, label: CATEGORY_LABELS[c] }))]}
            value={category}
            onChange={setCategory}
          />
          <ChipGroup
            label="Статус"
            options={[{ key: 'all', label: 'Все' }, ...STATUS_OPTIONS.map((c) => ({ key: c, label: STATUS_LABELS[c] }))]}
            value={status}
            onChange={setStatus}
          />
          <ChipGroup
            label="Период"
            options={[
              { key: 'all', label: 'Всё время' },
              { key: 'month', label: 'Этот месяц' },
            ]}
            value={period}
            onChange={setPeriod}
          />

          <Card style={{ marginTop: spacing.sm }}>
            <Text style={styles.totalLine}>
              Найдено: {totals.count} · Сумма: {formatMoney(totals.price)}
            </Text>
          </Card>

          {filteredCalcs.length === 0 ? (
            <Card>
              <EmptyState title="Ничего не найдено" subtitle="Измените фильтры или создайте новый расчёт." />
            </Card>
          ) : (
            filteredCalcs.map((calc) => {
              const st = STATUS_COLORS[calc.status];
              return (
                <Pressable key={calc.id} onPress={() => router.push(`/calculation/${calc.id}`)}>
                  <Card>
                    <View style={styles.rowBetween}>
                      <Text style={styles.title} numberOfLines={1}>
                        {calc.caseTitle || CATEGORY_LABELS[calc.category]}
                      </Text>
                      <Text style={styles.price}>{formatMoney(calc.result.finalPrice)}</Text>
                    </View>
                    <Text style={styles.meta}>
                      {calc.clientName || 'Без клиента'} · в.{calc.version} · {formatDateTime(calc.createdAt)}
                    </Text>
                    <View style={styles.badges}>
                      <Badge text={CATEGORY_LABELS[calc.category]} />
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
        </View>
      ) : (
        <View>
          {sortedPayments.length === 0 ? (
            <Card>
              <EmptyState title="Платежей пока нет" subtitle="Добавьте платёж в карточке дела." />
            </Card>
          ) : (
            sortedPayments.map((p) => (
              <Card key={p.id}>
                <View style={styles.rowBetween}>
                  <Text style={styles.title}>{formatMoney(p.amount)}</Text>
                  <Text style={styles.meta}>{formatDateTime(p.date)}</Text>
                </View>
                {p.comment ? <Text style={styles.meta}>{p.comment}</Text> : null}
              </Card>
            ))
          )}
        </View>
      )}
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: fontSize.md,
    color: colors.text,
    marginVertical: spacing.sm,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
  price: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  totalLine: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
});

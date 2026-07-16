import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, EmptyState, Row, SectionTitle } from '@/components/ui';
import { CATEGORY_LABELS, CLIENT_TYPE_LABELS, STATUS_COLORS, STATUS_LABELS } from '@/constants/labels';
import { colors, fontSize, spacing } from '@/constants/theme';
import { caseFinance } from '@/domain/selectors';
import { useApp } from '@/store/AppStore';
import { formatDateTime, formatMoney } from '@/utils/format';

export default function ClientDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const client = app.clients.find((c) => c.id === id);

  const clientCases = useMemo(() => app.cases.filter((c) => c.clientId === id), [app.cases, id]);
  const clientCalcs = useMemo(() => app.calculations.filter((c) => c.clientId === id), [app.calculations, id]);
  const clientPayments = useMemo(() => app.payments.filter((p) => p.clientId === id), [app.payments, id]);

  if (!client) {
    return (
      <View style={[styles.screen, styles.center]}>
        <EmptyState title="Клиент не найден" />
      </View>
    );
  }

  function toggleArchive() {
    app.setClientArchived(client!.id, !client!.archived);
  }

  function remove() {
    const hasHistory = clientCases.length > 0 || clientCalcs.length > 0 || clientPayments.length > 0;
    if (hasHistory) {
      Alert.alert(
        'У клиента есть история',
        'Чтобы не потерять расчёты и дела, можно архивировать клиента. Полное удаление уничтожит все связанные дела, расчёты и платежи.',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Архивировать', onPress: () => app.setClientArchived(client!.id, true) },
          {
            text: 'Удалить всё',
            style: 'destructive',
            onPress: () =>
              Alert.alert('Точно удалить?', 'Это действие необратимо.', [
                { text: 'Отмена', style: 'cancel' },
                {
                  text: 'Удалить',
                  style: 'destructive',
                  onPress: async () => {
                    await app.deleteClient(client!.id, true);
                    router.back();
                  },
                },
              ]),
          },
        ]
      );
    } else {
      Alert.alert('Удалить клиента?', 'Клиент будет удалён.', [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            await app.deleteClient(client!.id, false);
            router.back();
          },
        },
      ]);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.headRow}>
        <Text style={styles.name}>{client.name}</Text>
        {client.archived ? <Badge text="Архив" bg={colors.surfaceAlt} color={colors.textMuted} /> : null}
      </View>

      <Card>
        <Row label="Тип" value={CLIENT_TYPE_LABELS[client.type]} />
        {client.phone ? <Row label="Телефон" value={client.phone} /> : null}
        {client.inn ? <Row label="ИНН" value={client.inn} /> : null}
        {client.note ? <Row label="Заметка" value={client.note} /> : null}
      </Card>

      <View style={styles.btnRow}>
        <Button title="Изменить" variant="secondary" onPress={() => router.push(`/client/edit?id=${client.id}`)} style={{ flex: 1 }} />
        <Button title={client.archived ? 'Из архива' : 'В архив'} variant="secondary" onPress={toggleArchive} style={{ flex: 1 }} />
      </View>
      <Button title="＋ Новое дело" variant="accent" onPress={() => router.push(`/case/edit?clientId=${client.id}`)} style={{ marginBottom: spacing.md }} />

      <SectionTitle>Дела</SectionTitle>
      {clientCases.length === 0 ? (
        <Card><EmptyState title="Дел пока нет" /></Card>
      ) : (
        clientCases.map((c) => {
          const fin = caseFinance(c, app.payments);
          const st = STATUS_COLORS[c.status];
          return (
            <Pressable key={c.id} onPress={() => router.push(`/case/${c.id}`)}>
              <Card>
                <View style={styles.rowBetween}>
                  <Text style={styles.caseTitle} numberOfLines={1}>{c.title}</Text>
                  <Badge text={STATUS_LABELS[c.status]} bg={st.bg} color={st.color} />
                </View>
                <Text style={styles.meta}>{CATEGORY_LABELS[c.category]}</Text>
                <Row label="Цена" value={formatMoney(fin.price)} />
                <Row label="Остаток" value={formatMoney(fin.remaining)} />
              </Card>
            </Pressable>
          );
        })
      )}

      <SectionTitle>Расчёты</SectionTitle>
      {clientCalcs.length === 0 ? (
        <Card><EmptyState title="Расчётов пока нет" /></Card>
      ) : (
        clientCalcs.map((calc) => (
          <Pressable key={calc.id} onPress={() => router.push(`/calculation/${calc.id}`)}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.caseTitle} numberOfLines={1}>{calc.caseTitle}</Text>
                <Text style={styles.price}>{formatMoney(calc.result.finalPrice)}</Text>
              </View>
              <Text style={styles.meta}>в.{calc.version} · {formatDateTime(calc.createdAt)}</Text>
            </Card>
          </Pressable>
        ))
      )}

      <View style={{ height: spacing.lg }} />
      <Button title="Удалить клиента" variant="danger" onPress={remove} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, flex: 1 },
  btnRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  caseTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2, marginBottom: spacing.xs },
  price: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
});

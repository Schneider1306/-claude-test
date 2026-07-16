import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, EmptyState, SectionTitle } from '@/components/ui';
import { CLIENT_TYPE_LABELS } from '@/constants/labels';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useApp } from '@/store/AppStore';

export default function ClientsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clients, cases } = useApp();
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => (showArchived ? c.archived : !c.archived))
      .filter((c) => (q ? c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q) : true));
  }, [clients, query, showArchived]);

  function caseCount(clientId: string) {
    return cases.filter((c) => c.clientId === clientId && !c.archived).length;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      keyboardShouldPersistTaps="handled"
    >
      <SectionTitle>Клиенты</SectionTitle>

      <Button
        title="＋  Новый клиент"
        variant="accent"
        onPress={() => router.push('/client/edit')}
        style={{ marginBottom: spacing.md }}
      />

      <TextInput
        style={styles.search}
        placeholder="Поиск по имени или телефону"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
      />

      <Pressable onPress={() => setShowArchived((v) => !v)} style={styles.toggle}>
        <Text style={styles.toggleText}>
          {showArchived ? '← Показать активных' : 'Показать архив →'}
        </Text>
      </Pressable>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={showArchived ? 'Архив пуст' : 'Пока нет клиентов'}
            subtitle={showArchived ? undefined : 'Добавьте первого клиента кнопкой выше.'}
          />
        </Card>
      ) : (
        filtered.map((client) => (
          <Pressable key={client.id} onPress={() => router.push(`/client/${client.id}`)}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.name} numberOfLines={1}>
                  {client.name}
                </Text>
                {client.archived ? <Badge text="Архив" bg={colors.surfaceAlt} color={colors.textMuted} /> : null}
              </View>
              <Text style={styles.meta}>{CLIENT_TYPE_LABELS[client.type]}</Text>
              {client.phone ? <Text style={styles.meta}>{client.phone}</Text> : null}
              <Text style={styles.cases}>Дел: {caseCount(client.id)}</Text>
            </Card>
          </Pressable>
        ))
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
    marginBottom: spacing.sm,
  },
  toggle: { paddingVertical: spacing.sm, marginBottom: spacing.sm },
  toggleText: { color: colors.accent, fontWeight: '600', fontSize: fontSize.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  cases: { fontSize: fontSize.sm, color: colors.primary, marginTop: spacing.xs, fontWeight: '600' },
});

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { showAlert } from '@/components/dialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ChipGroup, Field, SectionTitle } from '@/components/ui';
import { CLIENT_TYPE_LABELS, CLIENT_TYPE_OPTIONS } from '@/constants/labels';
import { colors, spacing } from '@/constants/theme';
import type { ClientType } from '@/domain/types';
import { useApp } from '@/store/AppStore';

export default function ClientEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const app = useApp();
  const existing = id ? app.clients.find((c) => c.id === id) : undefined;

  const [type, setType] = useState<ClientType>(existing?.type ?? 'individual');
  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [inn, setInn] = useState(existing?.inn ?? '');
  const [note, setNote] = useState(existing?.note ?? '');

  async function save() {
    if (name.trim().length === 0) {
      showAlert('Проверьте данные', 'Укажите ФИО или название клиента.');
      return;
    }
    if (existing) {
      await app.updateClient({
        ...existing,
        type,
        name: name.trim(),
        phone: phone.trim() || undefined,
        inn: inn.trim() || undefined,
        note: note.trim() || undefined,
      });
    } else {
      await app.addClient({
        type,
        name: name.trim(),
        phone: phone.trim() || undefined,
        inn: inn.trim() || undefined,
        note: note.trim() || undefined,
      });
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <SectionTitle>{existing ? 'Редактировать клиента' : 'Новый клиент'}</SectionTitle>
        <ChipGroup
          label="Тип"
          options={CLIENT_TYPE_OPTIONS.map((t) => ({ key: t, label: CLIENT_TYPE_LABELS[t] }))}
          value={type}
          onChange={setType}
        />
        <Field label="ФИО или название" value={name} onChangeText={setName} placeholder="Иванов Иван Иванович" />
        <Field label="Телефон (необязательно)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+7 900 000-00-00" />
        <Field label="ИНН (необязательно)" value={inn} onChangeText={setInn} keyboardType="number-pad" />
        <Field label="Заметка (необязательно)" value={note} onChangeText={setNote} multiline />
        <Button title="Сохранить" variant="accent" onPress={save} style={{ marginTop: spacing.sm }} />
        <Button title="Отмена" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
});

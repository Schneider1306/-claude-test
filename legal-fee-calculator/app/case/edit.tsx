import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { showAlert } from '@/components/dialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ChipGroup, Field, NumberInput, SectionTitle } from '@/components/ui';
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  STAGE_LABELS,
  STAGE_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from '@/constants/labels';
import { colors, spacing } from '@/constants/theme';
import type { CaseCategory, CaseStage, CaseStatus } from '@/domain/types';
import { useApp } from '@/store/AppStore';

export default function CaseEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, clientId } = useLocalSearchParams<{ id?: string; clientId?: string }>();
  const app = useApp();
  const existing = id ? app.cases.find((c) => c.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState<CaseCategory>(existing?.category ?? 'civil');
  const [stage, setStage] = useState<CaseStage>(existing?.stage ?? 'first_instance');
  const [status, setStatus] = useState<CaseStatus>(existing?.status ?? 'draft');
  const [note, setNote] = useState(existing?.note ?? '');
  const [startDate, setStartDate] = useState(existing?.startDate ?? '');
  const [plannedHours, setPlannedHours] = useState(existing?.plannedHours ?? 0);
  const [actualHours, setActualHours] = useState(existing?.actualHours ?? 0);
  const [contractPrice, setContractPrice] = useState(existing?.contractPrice ?? 0);

  async function save() {
    if (title.trim().length === 0) {
      showAlert('Проверьте данные', 'Укажите название дела.');
      return;
    }
    const targetClientId = existing?.clientId ?? clientId;
    if (!targetClientId) {
      showAlert('Ошибка', 'Не указан клиент.');
      return;
    }
    if (existing) {
      await app.updateCase({
        ...existing,
        title: title.trim(),
        category,
        stage,
        status,
        note: note.trim() || undefined,
        startDate: startDate.trim() || undefined,
        plannedHours,
        actualHours,
        contractPrice,
      });
    } else {
      await app.addCase({
        clientId: targetClientId,
        title: title.trim(),
        category,
        stage,
        status,
        note: note.trim() || undefined,
        startDate: startDate.trim() || undefined,
        plannedHours,
        actualHours,
        contractPrice,
      });
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <SectionTitle>{existing ? 'Редактировать дело' : 'Новое дело'}</SectionTitle>
        <Field label="Название дела" value={title} onChangeText={setTitle} placeholder="Например: спор с клиникой" />
        <ChipGroup label="Категория" options={CATEGORY_OPTIONS.map((c) => ({ key: c, label: CATEGORY_LABELS[c] }))} value={category} onChange={setCategory} />
        <ChipGroup label="Стадия" options={STAGE_OPTIONS.map((c) => ({ key: c, label: STAGE_LABELS[c] }))} value={stage} onChange={setStage} />
        <ChipGroup label="Статус" options={STATUS_OPTIONS.map((c) => ({ key: c, label: STATUS_LABELS[c] }))} value={status} onChange={setStatus} />
        <Field label="Заметка (необязательно)" value={note} onChangeText={setNote} multiline placeholder="Нейтральное описание" />
        <Field label="Дата начала (ДД.ММ.ГГГГ)" value={startDate} onChangeText={setStartDate} placeholder="16.07.2026" />
        <NumberInput label="Плановые часы" mode="decimal" value={plannedHours} onChangeNumber={setPlannedHours} suffix="ч" />
        <NumberInput label="Фактические часы" mode="decimal" value={actualHours} onChangeNumber={setActualHours} suffix="ч" />
        <NumberInput label="Договорная цена" value={contractPrice} onChangeNumber={setContractPrice} suffix="₽" />
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

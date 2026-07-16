import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ChipGroup, Field, NumberInput, Row, Card, SectionTitle } from '@/components/ui';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS } from '@/constants/labels';
import { colors, spacing } from '@/constants/theme';
import type { PaymentMethod } from '@/domain/types';
import { caseFinance } from '@/domain/selectors';
import { useApp } from '@/store/AppStore';
import { formatMoney } from '@/utils/format';

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function parseDateInput(text: string): string {
  const m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return new Date().toISOString();
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export default function NewPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const app = useApp();
  const legalCase = app.cases.find((c) => c.id === caseId);

  const [dateText, setDateText] = useState(today());
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [comment, setComment] = useState('');

  const fin = legalCase ? caseFinance(legalCase, app.payments) : null;

  async function save() {
    if (!legalCase) {
      Alert.alert('Ошибка', 'Дело не найдено.');
      return;
    }
    if (amount <= 0) {
      Alert.alert('Проверьте сумму', 'Сумма платежа должна быть больше нуля.');
      return;
    }
    await app.addPayment({
      caseId: legalCase.id,
      clientId: legalCase.clientId,
      date: parseDateInput(dateText),
      amount,
      method,
      comment: comment.trim() || undefined,
    });
    router.back();
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <SectionTitle>Новый платёж</SectionTitle>
        {fin ? (
          <Card>
            <Row label="Цена" value={formatMoney(fin.price)} />
            <Row label="Оплачено" value={formatMoney(fin.paid)} />
            <Row label="Остаток" value={formatMoney(fin.remaining)} strong />
          </Card>
        ) : null}
        <NumberInput label="Сумма" value={amount} onChangeNumber={setAmount} suffix="₽" />
        <Field label="Дата (ДД.ММ.ГГГГ)" value={dateText} onChangeText={setDateText} />
        <ChipGroup
          label="Способ оплаты"
          options={PAYMENT_METHOD_OPTIONS.map((m) => ({ key: m, label: PAYMENT_METHOD_LABELS[m] }))}
          value={method}
          onChange={setMethod}
        />
        <Field label="Комментарий (необязательно)" value={comment} onChangeText={setComment} multiline />
        <Text style={styles.hint}>Отрицательные суммы не сохраняются.</Text>
        <Button title="Сохранить платёж" variant="accent" onPress={save} style={{ marginTop: spacing.sm }} />
        <Button title="Отмена" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});

// Переиспользуемые компоненты интерфейса.

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/theme';

// --- Карточка ---
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// --- Заголовок раздела ---
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Caption({ children }: { children: React.ReactNode }) {
  return <Text style={styles.caption}>{children}</Text>;
}

// --- Кнопка ---
type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const palette = buttonPalette(variant);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[styles.buttonText, { color: palette.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

function buttonPalette(variant: ButtonVariant) {
  switch (variant) {
    case 'accent':
      return { bg: colors.accent, text: colors.white, border: colors.accent };
    case 'secondary':
      return { bg: colors.surfaceAlt, text: colors.primary, border: colors.border };
    case 'danger':
      return { bg: colors.danger, text: colors.white, border: colors.danger };
    case 'ghost':
      return { bg: 'transparent', text: colors.primary, border: 'transparent' };
    case 'primary':
    default:
      return { bg: colors.primary, text: colors.white, border: colors.primary };
  }
}

// --- Поле ввода с подписью ---
export function Field({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...props}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

// --- Числовое поле (целое или дробное) ---
export function NumberInput({
  label,
  value,
  onChangeNumber,
  mode = 'int',
  hint,
  placeholder = '0',
  suffix,
}: {
  label: string;
  value: number;
  onChangeNumber: (n: number) => void;
  mode?: 'int' | 'decimal';
  hint?: string;
  placeholder?: string;
  suffix?: string;
}) {
  const parse = React.useCallback(
    (t: string): number => {
      const cleaned =
        mode === 'decimal'
          ? t.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '')
          : t.replace(/[^\d]/g, '');
      const n = mode === 'decimal' ? parseFloat(cleaned) : parseInt(cleaned, 10);
      return Number.isNaN(n) ? 0 : n;
    },
    [mode]
  );

  const [text, setText] = React.useState(value ? String(value) : '');

  React.useEffect(() => {
    if (parse(text) !== value) {
      setText(value === 0 ? '' : String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.numberRow}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            onChangeNumber(parse(t));
          }}
          keyboardType={mode === 'decimal' ? 'decimal-pad' : 'number-pad'}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { flex: 1 }]}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

// --- Группа выбора (чипы) ---
export function ChipGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = opt.key === value;
          return (
            <Pressable
              key={String(opt.key)}
              onPress={() => onChange(opt.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// --- Строка «ключ — значение» ---
export function Row({
  label,
  value,
  strong = false,
  color,
}: {
  label: string;
  value: string;
  strong?: boolean;
  color?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.rowStrong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowStrong, color ? { color } : null]}>
        {value}
      </Text>
    </View>
  );
}

// --- Пустое состояние ---
export function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// --- Бейдж ---
export function Badge({
  text,
  bg = colors.accentSoft,
  color = colors.accent,
}: {
  text: string;
  bg?: string;
  color?: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

// --- Предупреждение ---
export function WarningBox({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <View style={styles.warningBox}>
      {messages.map((m, i) => (
        <Text key={i} style={styles.warningText}>
          ⚠ {m}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  caption: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: fontSize.md, fontWeight: '600' },
  fieldWrap: { marginBottom: spacing.md },
  fieldLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  fieldHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 50,
  },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  suffix: { fontSize: fontSize.md, color: colors.textMuted, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted, flexShrink: 1 },
  rowValue: { fontSize: fontSize.md, color: colors.text, fontWeight: '500', textAlign: 'right' },
  rowStrong: { fontWeight: '700', color: colors.text, fontSize: fontSize.md },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  warningBox: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginVertical: spacing.sm,
    gap: spacing.xs,
  },
  warningText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '600' },
});

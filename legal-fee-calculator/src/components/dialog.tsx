// Кроссплатформенные диалоги. На телефоне используем нативный Alert,
// в вебе (Safari на iPhone / PWA) — собственное модальное окно, потому что
// react-native-web не поддерживает многокнопочный Alert с колбэками.

import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/theme';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface DialogState {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

type Handler = (title: string, message?: string, buttons?: DialogButton[]) => void;

let handler: Handler | null = null;

// Замена Alert.alert с той же сигнатурой.
export function showAlert(title: string, message?: string, buttons?: DialogButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  if (handler) {
    handler(title, message, buttons);
  } else if (typeof window !== 'undefined') {
    window.alert([title, message].filter(Boolean).join('\n\n'));
    // Без хоста запускаем первое неотменяющее действие.
    const primary = (buttons ?? []).find((b) => b.style !== 'cancel');
    primary?.onPress?.();
  }
}

// Монтируется один раз в корне приложения.
export function DialogHost() {
  const [state, setState] = useState<DialogState | null>(null);

  useEffect(() => {
    handler = (title, message, buttons) => {
      setState({
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
      });
    };
    return () => {
      handler = null;
    };
  }, []);

  if (Platform.OS !== 'web' || !state) return null;

  function press(btn: DialogButton) {
    setState(null);
    btn.onPress?.();
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => setState(null)}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{state.title}</Text>
          {state.message ? <Text style={styles.message}>{state.message}</Text> : null}
          <View style={styles.buttons}>
            {state.buttons.map((btn, i) => (
              <Pressable key={i} onPress={() => press(btn)} style={styles.button}>
                <Text
                  style={[
                    styles.buttonText,
                    btn.style === 'destructive' && { color: colors.danger },
                    btn.style === 'cancel' && { color: colors.textMuted },
                  ]}
                >
                  {btn.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  message: { fontSize: fontSize.md, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 22 },
  buttons: { gap: spacing.sm },
  button: {
    minHeight: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: { fontSize: fontSize.md, fontWeight: '600', color: colors.primary },
});

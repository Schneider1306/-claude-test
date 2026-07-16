import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { AppProvider } from '@/store/AppStore';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
            headerTitleStyle: { fontWeight: '700', color: colors.text },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]" options={{ title: 'Клиент' }} />
          <Stack.Screen name="client/edit" options={{ title: 'Клиент', presentation: 'modal' }} />
          <Stack.Screen name="case/[id]" options={{ title: 'Дело' }} />
          <Stack.Screen name="case/edit" options={{ title: 'Дело', presentation: 'modal' }} />
          <Stack.Screen name="calculation/[id]" options={{ title: 'Расчёт' }} />
          <Stack.Screen name="payment/new" options={{ title: 'Платёж', presentation: 'modal' }} />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}

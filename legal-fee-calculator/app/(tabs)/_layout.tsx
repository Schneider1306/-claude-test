import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { colors } from '@/constants/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 88,
          paddingBottom: 30,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: 'Расчёт',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧮" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Клиенты',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'История',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Настройки',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

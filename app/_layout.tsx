import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MockStoreProvider } from '../lib/mock/store';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <MockStoreProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Predicciones' }} />
        <Stack.Screen name="group/[groupId]" options={{ headerShown: false }} />
        <Stack.Screen name="poll/[pollId]" options={{ title: '' }} />
      </Stack>
    </MockStoreProvider>
  );
}

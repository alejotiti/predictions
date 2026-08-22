import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth';
import { GroupsProvider } from '../lib/groups';
import { colors, type as t } from '../theme';

// El splash nativo se queda puesto hasta saber si hay sesión guardada: así no
// se ve un instante de login antes de entrar a la app, ni al revés (§2, §7).
void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status } = useAuth();
  const ready = status !== 'loading';
  const signedIn = status === 'signedIn';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Mientras se resuelve la sesión no montamos ninguna ruta: sólo el papel de
  // fondo, para que no haya un frame con la pantalla equivocada.
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { ...t.title },
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* Alta de grupo: header propio dentro de la pantalla, no el del Stack. */}
        <Stack.Screen name="groups/new" options={{ headerShown: false }} />
        <Stack.Screen name="groups/join" options={{ headerShown: false }} />
        <Stack.Screen name="group/[groupId]" options={{ headerShown: false }} />
        {/* Header propio adentro de la pantalla, como las altas de grupo: el
            nativo le pone al saldo una cápsula de vidrio que el header de las
            pestañas no tiene, y las dos burbujas quedaban distintas. Ver
            components/ScreenHeader. */}
        <Stack.Screen name="poll/[pollId]" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    // expo-router no lo pone solo, y sin esta raíz los gestos de
    // react-native-gesture-handler no llegan: el deslizar para salir de un
    // grupo simplemente no pasaría nada.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        {/* Lo de adentro del grupo no tiene provider: cada pantalla pide lo suyo
            con los hooks de `lib/predictions.tsx` y recarga al volver al foco. */}
        <GroupsProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </GroupsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

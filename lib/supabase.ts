/**
 * Cliente único de Supabase (§1). Se importa desde acá y no se instancia en
 * ningún otro lado: dos clientes serían dos sesiones distintas en memoria.
 *
 * La sesión se guarda en AsyncStorage para que sobreviva a cerrar la app, y el
 * refresh de tokens se maneja solo (ver el listener de AppState en lib/auth.tsx).
 * `detectSessionInUrl` va en false porque en React Native no hay URL que mirar.
 *
 * Sólo la publishable key, que es pública por diseño (§9). La service_role
 * jamás entra al bundle: la autoridad sobre datos es RLS, no el cliente.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Copiá .env.example a .env y reiniciá el bundler con `npx expo start -c`.',
  );
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    // En nativo la sesión va a AsyncStorage. En web dejamos el storage por
    // defecto de supabase-js, que ya cae a memoria cuando no hay `window`
    // (si no, el prerender estático del build web revienta).
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

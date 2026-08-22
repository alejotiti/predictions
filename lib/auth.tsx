/**
 * Sesión de Supabase para toda la app (§2).
 *
 * `status` arranca en 'loading' y sólo pasa a 'signedIn'/'signedOut' cuando
 * Supabase confirmó si había sesión guardada. Las pantallas nunca deciden a
 * mano si mostrar login: miran este estado (§7, nada de parpadeos).
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { authErrorMessage } from './errors';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type SignUpResult = {
  /** El proyecto exige confirmar el mail: no hay sesión hasta que el usuario la confirme. */
  needsEmailConfirmation: boolean;
};

type AuthApi = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Sesión persistida en AsyncStorage: esto es lo que hace que al reabrir la
    // app el usuario siga adentro.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted.current) return;
        setSession(data.session);
        setStatus(data.session ? 'signedIn' : 'signedOut');
      })
      .catch(() => {
        if (!mounted.current) return;
        setSession(null);
        setStatus('signedOut');
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted.current) return;
      setSession(next);
      setStatus(next ? 'signedIn' : 'signedOut');
    });

    // Sin esto el token deja de refrescarse cuando la app estuvo en background.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
      appState.remove();
    };
  }, []);

  const api = useMemo<AuthApi>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw new Error(authErrorMessage(error));
      },
      async signUp(email, password, username) {
        // El trigger de la base crea el `profiles` a partir de estos metadatos:
        // el cliente no inserta el perfil a mano (§9).
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim(),
              display_name: username.trim(),
            },
          },
        });
        if (error) throw new Error(authErrorMessage(error));
        return { needsEmailConfirmation: !data.session };
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(authErrorMessage(error));
      },
    }),
    [session, status],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}

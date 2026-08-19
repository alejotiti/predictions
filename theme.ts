/**
 * Dirección visual (§16): mercado social entre amigos, no formulario ni casino.
 * Fondo papel frío + tinta, azul/naranja en lugar de verde/rojo para evitar
 * lectura de casino o semáforo. Cifras en mono: los puntos son un ledger.
 */
import { Platform } from 'react-native';

export const colors = {
  paper: '#E9EBF0',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F6FA',
  line: '#D6DBE5',
  ink: '#141820',
  muted: '#5C6675',
  yes: '#1F6FEB',
  yesSoft: '#E3EDFD',
  no: '#E4572E',
  noSoft: '#FBE9E2',
  danger: '#C0392B',
} as const;

export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

export const type = {
  display: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.8 },
  title: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.6 },
  points: { fontFamily: mono, fontSize: 15, fontWeight: '600' as const },
  pointsBig: { fontFamily: mono, fontSize: 28, fontWeight: '700' as const },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20 };

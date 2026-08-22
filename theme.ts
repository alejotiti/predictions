/**
 * Sistema de diseño (§16). Las reglas escritas están en DESIGN.md; esto es la
 * única fuente de los valores. Nada de literales de color, radio o tamaño
 * sueltos en las pantallas: si falta un valor, se agrega acá.
 *
 * Dirección: mercado social entre amigos, no formulario ni casino. Papel frío
 * y tinta casi negra, tarjetas blancas flotando con sombra suave, azul/naranja
 * para SÍ/NO en vez de verde/rojo. El verde queda reservado para dos cosas que
 * no son un lado: el punto de "abierta" y el multiplicador.
 */
import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  /** Fondo de toda la app. Frío, nunca blanco: la tarjeta blanca tiene que flotar. */
  paper: '#E8EAF0',
  surface: '#FFFFFF',
  /** Cajas dentro de una tarjeta (posición propia, chips, huesos de carga). */
  surfaceAlt: '#F1F3F8',
  line: '#E1E5EE',
  ink: '#0E1116',
  muted: '#6C7484',
  /**
   * Metadatos de tercer nivel: rótulos y timestamps. Sobre blanco da 2.7:1, así
   * que es para lo que se mira de reojo. Lo que se lee de verdad —un nombre,
   * por ejemplo— va en `muted`.
   */
  faint: '#98A0AE',
  /** Fechas y datos con jerarquía propia bajo un título. */
  accent: '#5B67D8',
  yes: '#1F6FEB',
  yesSoft: '#E3EDFD',
  no: '#E4572E',
  noSoft: '#FBE9E2',
  /** Punto de "está abierta". No es un lado ni un semáforo. */
  live: '#22C55E',
  /** Multiplicador y retorno estimado. Tampoco es un lado. */
  gain: '#15A34A',
  warn: '#8A6100',
  warnSoft: '#FFF3D6',
  danger: '#C0392B',
  /**
   * El oscurecido de atrás de la hoja de apostar. Es una capa propia, no el
   * papel de la hoja: se funde sola mientras la hoja sube.
   */
  scrim: 'rgba(14,17,22,0.45)',
} as const;

/**
 * Una sola familia para todo, la del sistema. Las cifras no cambian de fuente:
 * se distinguen por peso y por `tabular-nums`, que es lo que las mantiene
 * alineadas en columna sin el ruido de una monoespaciada.
 */
export const type = {
  display: { fontSize: 30, fontWeight: '800', letterSpacing: -0.7, lineHeight: 36 },
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6, lineHeight: 30 },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  small: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  /** Rótulo de sección: versalita gris, siempre en mayúsculas y espaciada. */
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  /**
   * Rótulo de la barra de pestañas. No es `label`: ahí abajo el nombre se lee
   * de corrido debajo de su ícono, así que va sin mayúsculas ni espaciado.
   */
  tab: { fontSize: 11, fontWeight: '600' },
  num: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  numBig: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** `sm` es el radio de un control, `lg` el de una tarjeta. No hay esquinas vivas. */
export const radius = { xs: 8, sm: 12, md: 16, lg: 20, xl: 26, pill: 999 };

/**
 * La tarjeta se separa del papel con sombra, no con borde: un contorno gris
 * sobre fondo gris no separa nada y además compite con las barras del pozo.
 */
export const shadow = {
  card: {
    shadowColor: '#0E1116',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} satisfies Record<string, ViewStyle>;

/** Alto de los controles: botón, campo y burbuja del compositor comparten módulo. */
export const control = { height: 50, sendSize: 46 };

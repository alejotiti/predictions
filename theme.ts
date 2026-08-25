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
  /**
   * El lado como TEXTO sobre su propio chip. El color de relleno no sirve para
   * eso: `yes` sobre `yesSoft` da 3,9:1 y la vara de un rótulo de 11 es 4,5.
   * Es el escalón más oscuro del mismo tono, como el 700 de una escala frente
   * al 600 —no un azul nuevo—: 5,0:1 sobre el chip.
   */
  yesInk: '#1A5FCC',
  /**
   * Oscurecido desde `#E4572E`, que con el rótulo blanco encima daba 3,7:1 y no
   * llegaba a la vara: el rótulo de la barra es 13 en peso 800, que bajo WCAG
   * es texto normal y no texto grande. Ahora da 5,2:1, y el tono se corrió de
   * 13° a 17° —hacia el naranja, alejándose de `danger`, que está en 6°—.
   */
  no: '#C2410C',
  noSoft: '#FBE9E2',
  /** El NO como texto sobre su chip, por lo mismo que `yesInk`: 5,5:1. */
  noInk: '#A8380B',
  /**
   * Punto de "está abierta". No es un lado ni un semáforo. Es un gráfico y no
   * un texto, así que su vara es 3:1 y no 4,5: `#22C55E` daba 2,3 y se perdía
   * sobre la tarjeta blanca. Éste da 3,3.
   */
  live: '#16A34A',
  /**
   * Multiplicador y retorno estimado. Tampoco es un lado. Oscurecido desde
   * `#15A34A`, que sobre la tarjeta daba 3,3:1 siendo texto. Mismo tono, 5,0:1.
   */
  gain: '#15803D',
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

/**
 * Movimiento (§Movimiento del DESIGN.md). Va acá por la misma razón que los
 * colores: una duración suelta adentro de una pantalla es un literal, y dos
 * pantallas que animan lo mismo a 200 y a 260 se sienten como dos apps.
 *
 * Las curvas no son las de fábrica. `Easing.out(Easing.ease)` es demasiado
 * floja para que 200 ms se lean como 200 ms; éstas son las que usa la web para
 * lo mismo, escritas como bézier.
 */
export const motion = {
  duration: {
    /** Respuesta a un dedo: apretar un botón o una tarjeta. */
    press: 120,
    /** Algo que aparece o desaparece: un rótulo, una píldora, un mensaje. */
    enter: 220,
    /** Algo que se mueve o se transforma en pantalla: la barra del pozo. */
    move: 280,
    /** El latido de los huesos y del punto de "abierta". */
    beat: 750,
  },
  /**
   * Escalonado de una lista. 40 ms es lo que separa una entrada de otra sin que
   * la última se haga esperar: con diez tarjetas, la última arranca a 400 ms.
   */
  stagger: 40,
  /** Tope del escalonado: pasadas ocho tarjetas ya no se suma retraso. */
  staggerCap: 8,
  bezier: {
    /** Entrar y salir. Nunca `ease-in`: empieza lento justo cuando se mira. */
    out: [0.23, 1, 0.32, 1] as const,
    /** Moverse de un lado a otro dentro de la pantalla. */
    inOut: [0.77, 0, 0.175, 1] as const,
  },
  /**
   * Para lo que tiene que sentirse vivo y para lo que el dedo puede
   * interrumpir. El rebote se queda abajo: arriba de 0,3 se lee de juguete.
   */
  spring: { damping: 18, stiffness: 260, mass: 0.7 },
  /** El resorte del que devuelve algo a su lugar con un poco más de gracia. */
  springPop: { damping: 12, stiffness: 320, mass: 0.6 },
  /** Cuánto se hunde lo que se aprieta. Menos que esto no se ve. */
  pressScale: 0.97,
  /** La tarjeta es grande: se hunde menos, o parece que se dobla. */
  pressScaleCard: 0.985,
} as const;

import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  makeMutable,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, control, motion, radius, shadow, space, type as t } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const easeOut = Easing.bezier(...motion.bezier.out);

/**
 * Un solo latido para todos los puntos de "abierta" que haya en pantalla, en un
 * valor de módulo. Es el mismo truco que usan los huesos de carga y por la misma
 * razón: con una tarjeta por predicción, diez relojes desfasados no se leen como
 * diez cosas abiertas sino como ruido. En fase se lee como un pulso solo, y
 * además corre una animación sola por más puntos que haya.
 */
const heartbeat = makeMutable(1);
let beating = false;

function startHeartbeat() {
  if (beating) return;
  beating = true;
  const half = { duration: motion.duration.beat, easing: Easing.inOut(Easing.quad) };
  heartbeat.value = withRepeat(
    withSequence(withTiming(0.4, half), withTiming(1, half)),
    -1,
    false,
  );
}

/**
 * Aparecer con un resorte, desde 0,6 y no desde 0: nada en el mundo real
 * aparece de la nada, y una escala que arranca en cero se lee como un truco.
 */
function PopIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.6 }] },
    animations: {
      opacity: withTiming(1, { duration: motion.duration.press, easing: easeOut }),
      transform: [{ scale: withSpring(1, motion.springPop) }],
    },
  };
}

/**
 * La tarjeta se separa del papel con sombra y no con borde (DESIGN.md): sobre
 * un fondo gris, un contorno gris no separa nada y le compite a la barra del
 * pozo, que es lo único que tiene que llamar la atención adentro.
 */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

/**
 * El punto verde de "esto está abierto". No es un lado ni un semáforo.
 *
 * Late, porque es lo único de la tarjeta que habla del ahora: lo demás —el
 * pozo, la barra, tu posición— es una foto. Con la opacidad sola, así que el
 * punto no cambia de tamaño ni empuja al tiempo restante que tiene al lado.
 */
export function LiveDot({ color = colors.live, size = 7 }: { color?: string; size?: number }) {
  // Con el movimiento reducido el punto se queda quieto y entero: lo que dice
  // —"esto está abierta"— lo dice el color y el lugar, no el latido.
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!reduced) startHeartbeat();
  }, [reduced]);

  const style = useAnimatedStyle(() => ({ opacity: reduced ? 1 : heartbeat.value }));

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

/**
 * Comentarios que todavía no viste, arriba a la derecha de la tarjeta.
 *
 * Va en `colors.accent` y no en `colors.yes`: azul, pero no el azul del SÍ, así
 * que un punto suelto en una esquina no se lee como un lado (DESIGN.md). Es un
 * poco más grande que el punto de `live` para que no parezca el mismo dato
 * mirado de reojo.
 *
 * Punto pelado, sin el número adentro: lo único que hay que decidir mirándolo
 * es si entrar o no, y para eso alcanza con que haya algo. La cuenta va en la
 * etiqueta de accesibilidad, donde sí suma.
 */
export function UnreadDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Animated.View
      // Entra con un resorte y no de un corte: cuando aparece es porque alguien
      // acaba de escribir, y el punto tiene que llamar una vez. Arranca en 0,6
      // y no en 0 —nada aparece de la nada— y el rebote se queda corto: un
      // punto que salta se lee como un juguete y no como un aviso.
      entering={PopIn}
      accessibilityLabel={
        count === 1 ? '1 comentario sin leer' : `${count} comentarios sin leer`
      }
      style={styles.unreadDot}
    />
  );
}

export function Button({
  title,
  onPress,
  tone = 'ink',
  disabled,
  style,
  icon,
}: {
  title: string;
  onPress: () => void;
  tone?: 'ink' | 'yes' | 'no' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Recibe el color del texto para que el ícono siga el tono del botón. */
  icon?: (color: string) => React.ReactNode;
}) {
  const bg =
    tone === 'yes' ? colors.yes : tone === 'no' ? colors.no : tone === 'ghost' ? 'transparent' : colors.ink;
  const fg = tone === 'ghost' ? colors.ink : '#fff';

  // El hundido va en `transform` y no en el layout: no reflowea la fila de dos
  // botones ni empuja a la tarjeta. La ida es un timing corto —la respuesta al
  // dedo tiene que ser inmediata— y la vuelta un resorte, que es lo que hace
  // que soltar se sienta como soltar y no como otra animación.
  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        if (disabled) return;
        press.value = withTiming(motion.pressScale, {
          duration: motion.duration.press,
          easing: easeOut,
        });
      }}
      onPressOut={() => {
        press.value = withSpring(1, motion.spring);
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        // Deshabilitado es opacidad, no otro color: el botón se destiñe y se
        // lee "existe pero no ahora", que es justo lo que pasa con el lado
        // bloqueado cuando ya apostaste del otro.
        { backgroundColor: bg, opacity: disabled ? 0.35 : pressed ? 0.85 : 1 },
        tone === 'ghost' && styles.buttonGhost,
        pressStyle,
        style,
      ]}
    >
      <View style={styles.buttonContent}>
        {icon?.(fg)}
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
      </View>
    </AnimatedPressable>
  );
}

export function Pill({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'yes' | 'no' | 'warn' }) {
  // El texto no va en el color de relleno del lado sino en su escalón oscuro:
  // sobre el chip, el relleno no llega a la vara de contraste de un rótulo.
  const map = {
    neutral: { bg: colors.surfaceAlt, fg: colors.muted },
    yes: { bg: colors.yesSoft, fg: colors.yesInk },
    no: { bg: colors.noSoft, fg: colors.noInk },
    warn: { bg: colors.warnSoft, fg: colors.warn },
  }[tone];
  return (
    // La píldora reemplaza al punto de "abierta" cuando la predicción cierra, y
    // ese reemplazo es la noticia: entra fundiéndose para que se note que algo
    // cambió de estado, en vez de aparecer ya puesta como si hubiera estado ahí.
    <Animated.View
      entering={FadeIn.duration(motion.duration.enter).easing(easeOut)}
      style={[styles.pill, { backgroundColor: map.bg }]}
    >
      <Text style={[styles.pillText, { color: map.fg }]}>{text}</Text>
    </Animated.View>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    // Un vacío que aparece de golpe se lee como un error. Fundido, se lee como
    // la respuesta que llegó: acá no hay nada.
    <Animated.View
      entering={FadeIn.duration(motion.duration.enter).easing(easeOut)}
      style={styles.empty}
    >
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint && <Text style={styles.emptyHint}>{hint}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.card,
  },
  label: { ...t.label, color: colors.faint },
  // El `marginTop` lo centra contra el primer renglón del título (9 de punto
  // dentro de los 24 de `lineHeight`), que es donde tiene que quedar cuando el
  // título ocupa dos líneas.
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    marginTop: (t.title.lineHeight - 9) / 2,
  },
  button: {
    minHeight: control.height,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGhost: { borderWidth: 1, borderColor: colors.line },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  buttonText: { fontSize: 15, fontWeight: '700' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  empty: { padding: space.xl, alignItems: 'center', gap: 6 },
  emptyTitle: { ...t.body, fontWeight: '600', color: colors.ink },
  emptyHint: { ...t.small, color: colors.muted, textAlign: 'center' },
});

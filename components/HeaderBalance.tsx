import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, motion, radius, space, type as t } from '../theme';
import { Bone } from './Skeleton';
import { points } from '../lib/format';

const easeOut = Easing.bezier(...motion.bezier.out);

/**
 * Tu saldo, siempre arriba a la derecha del header y siempre igual (DESIGN.md).
 * No es un dato de la pantalla que estés mirando sino de la sesión, así que no
 * entra a la hoja ni a una tarjeta: si cambiara de lugar según dónde estás,
 * habría que buscarlo cada vez.
 *
 * Va adentro de una burbuja blanca y no suelto sobre el papel: un número solo
 * en una esquina se lee como parte del título de la pantalla. La burbuja lo
 * separa y lo convierte en una cosa propia, la misma en todas las pantallas.
 *
 * Cada pantalla trae su propio número, el que acaba de leer del ledger. Lo que
 * se comparte es el lugar y la forma, no el dato.
 */
export function HeaderBalance({ balance, loading }: { balance: number; loading?: boolean }) {
  // El saldo no cuenta hacia arriba: es un dato que se lee, y un número que
  // rueda es ilegible justo mientras cambia. La cifra salta a su valor nuevo y
  // lo que anima es la burbuja —un empujón corto— y el color del número, que se
  // va al verde del multiplicador si cobraste y al naranja del NO si apostaste.
  // Es acuse de recibo, no adorno: el saldo vive en el header y cambia lejos de
  // donde estás mirando, así que sin esto el cambio pasa sin que nadie lo vea.
  const previous = useRef(balance);
  const [tone, setTone] = useState<'up' | 'down'>('up');
  const bump = useSharedValue(1);
  const flash = useSharedValue(0);

  useEffect(() => {
    if (loading) return;
    if (previous.current === balance) return;
    setTone(balance > previous.current ? 'up' : 'down');
    previous.current = balance;

    bump.value = withSequence(
      withTiming(1.09, { duration: motion.duration.press, easing: easeOut }),
      withSpring(1, motion.springPop),
    );
    // Va y vuelve, y la vuelta es más lenta que la ida: el color tiene que
    // llamar de golpe y después soltar solo, sin pedir que lo miren.
    flash.value = withSequence(
      withTiming(1, { duration: motion.duration.press, easing: easeOut }),
      withTiming(0, { duration: motion.duration.beat, easing: easeOut }),
    );
  }, [balance, loading, bump, flash]);

  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      flash.value,
      [0, 1],
      [colors.ink, tone === 'up' ? colors.gain : colors.no],
    ),
  }));

  return (
    <Animated.View style={[styles.bubble, bubbleStyle]}>
      {/* Mientras carga no mostramos 0: un cero se lee como un saldo real. El
          hueso mide lo que mediría un saldo de cuatro cifras, así que la
          burbuja no cambia de ancho cuando llega el número. */}
      {loading ? (
        <Bone width={54} height={13} />
      ) : (
        <Animated.Text style={[styles.text, textStyle]}>{points(balance)} pts</Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    // El margen lo trae la burbuja y no el header: el contenedor derecho del
    // header de las pestañas no pone ninguno, así que sin esto quedaba pegada
    // al borde de la pantalla en "Inicio" y no en la otra.
    marginRight: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 32,
  },
  // El color lo pone la animación: en reposo vuelve siempre a `ink`.
  text: { ...t.num, fontSize: 14 },
});

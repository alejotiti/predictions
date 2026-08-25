import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, motion, space, type as t } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const easeOut = Easing.bezier(...motion.bezier.out);
import { Card, UnreadDot } from './ui';
import { PoolBar } from './PoolBar';
import { CloseDate, MyPosition, StatusRow } from './PollParts';
import { poolOf, myBetIn } from '../lib/predictions';
import { nameOf, type NameMap } from '../lib/profiles';
import { effectiveStatus } from '../lib/domain/poll';
import { estimatedMultiplier, totalPool } from '../lib/domain/market';
import { timeLeft } from '../lib/format';
import type { PollWithBets } from '../lib/db/types';

/**
 * La tarjeta del feed es el detalle recortado, con la misma anatomía y en el
 * escalón de abajo de la tipografía (DESIGN.md): título, fecha, estado y pozo,
 * barra, tu posición.
 *
 * El pozo y la apuesta propia salen de las apuestas que ya vinieron embebidas
 * con la poll: la tarjeta no hace ningún viaje extra a la red.
 */
export function PollCard({
  poll,
  names,
  userId,
  unread = 0,
  index = 0,
}: {
  poll: PollWithBets;
  names: NameMap;
  userId: string | null;
  /** Comentarios que no viste. Sale del feed, que lo pide contado a la base. */
  unread?: number;
  /** Lugar en el feed. Sólo escalona la entrada; no cambia nada de lo que dice. */
  index?: number;
}) {
  const router = useRouter();
  const pool = poolOf(poll.bets);
  const mine = myBetIn(poll.bets, userId);
  const status = effectiveStatus(poll.status, poll.betting_closes_at);
  const left = timeLeft(poll.betting_closes_at);

  // Se hunde menos que un botón: la tarjeta es grande y con el mismo 0,97
  // parece que se dobla en vez de responder.
  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  return (
    // Dos capas y no una. La entrada y el acomodo van en el envoltorio, y el
    // hundido del dedo en el Pressable de adentro: si las tres viven en el
    // mismo componente, la animación de layout le pisa el `transform` al
    // apretado —Reanimated lo avisa por consola— y el hundido se pierde justo
    // cuando la tarjeta se está reacomodando.
    <Animated.View
      // La entrada se escalona con el lugar en el feed: las tarjetas llegan de
      // a una y se lee el orden —lo que vence antes está arriba—, en vez de
      // aparecer el bloque entero de golpe cuando contesta la base. Pasadas
      // ocho ya no se suma retraso: la novena no puede hacerse esperar medio
      // segundo por estar novena.
      entering={FadeInDown.duration(motion.duration.enter)
        .easing(easeOut)
        .delay(Math.min(index, motion.staggerCap) * motion.stagger)}
      // Y cuando la tarjeta cambia de alto —aparece tu posición, se resuelve—
      // el feed de abajo acompaña en vez de saltar.
      layout={LinearTransition.duration(motion.duration.move).easing(
        Easing.bezier(...motion.bezier.inOut),
      )}
    >
    <AnimatedPressable
      onPress={() => router.push(`/poll/${poll.id}`)}
      onPressIn={() => {
        press.value = withTiming(motion.pressScaleCard, {
          duration: motion.duration.press,
          easing: easeOut,
        });
      }}
      onPressOut={() => {
        press.value = withSpring(1, motion.spring);
      }}
      style={pressStyle}
    >
      <Card style={{ gap: space.md }}>
        <View style={{ gap: 2 }}>
          {/* El punto va en la fila del título y no absoluto sobre la esquina:
              así un título de dos líneas lo empuja en vez de pasarle por
              debajo. */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { flex: 1 }]}>{poll.title}</Text>
            <UnreadDot count={unread} />
          </View>
          <CloseDate iso={poll.betting_closes_at} />
        </View>

        <StatusRow status={status} left={left} pool={totalPool(pool)} compact />

        <PoolBar pool={pool} compact />

        {mine && (
          <MyPosition
            side={mine.side}
            amount={mine.amount}
            multiplier={estimatedMultiplier(pool, mine.side, 0, mine.amount)}
            compact
          />
        )}

        <Text style={styles.by}>por {nameOf(names, poll.creator_id)}</Text>
      </Card>
    </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  title: { ...t.title, color: colors.ink },
  by: { ...t.small, fontSize: 12, color: colors.muted },
});

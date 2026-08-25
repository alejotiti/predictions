import { View, Text, StyleSheet } from 'react-native';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';
import { colors, motion, radius, space, type as t } from '../theme';

const easeOut = Easing.bezier(...motion.bezier.out);
import { LiveDot, Pill } from './ui';
import { statusLabel, type PollStatus } from '../lib/domain/poll';
import type { Side } from '../lib/domain/market';
import { points, shortDate } from '../lib/format';

/**
 * Las piezas que arman una predicción. Viven acá y no adentro de cada pantalla
 * porque la tarjeta del feed y el detalle son la misma anatomía en dos tamaños
 * (DESIGN.md): si se dibujan dos veces, se despegan a la primera que cambie.
 */

/** La fecha de cierre, pegada abajo del título y en el color de acento. */
export function CloseDate({ iso }: { iso: string }) {
  return <Text style={styles.date}>{shortDate(iso)}</Text>;
}

/**
 * Estado a la izquierda y pozo a la derecha. Mientras está abierta, el estado
 * es el punto verde con el tiempo que falta; una vez cerrada, la píldora dice
 * en qué quedó. Nunca los dos: son la misma pregunta contestada dos veces.
 */
export function StatusRow({
  status,
  left,
  pool,
  compact = false,
}: {
  status: PollStatus;
  /** Tiempo restante ya formateado, o null si ya venció. */
  left: string | null;
  pool: number;
  compact?: boolean;
}) {
  const open = status === 'OPEN' && !!left;
  return (
    <View style={styles.statusRow}>
      {open ? (
        <View style={styles.live}>
          <LiveDot />
          <Text style={styles.leftText}>{left}</Text>
        </View>
      ) : (
        <Pill
          text={statusLabel[status]}
          tone={status === 'RESOLVED_YES' ? 'yes' : status === 'RESOLVED_NO' ? 'no' : 'neutral'}
        />
      )}
      <View style={styles.potWrap}>
        <Text style={styles.potLabel}>Pozo</Text>
        <Text style={compact ? styles.potSmall : styles.pot}>{points(pool)} pts</Text>
      </View>
    </View>
  );
}

/**
 * Tu posición: cuánto pusiste y a qué lado, y en cuánto va el multiplicador.
 * En el detalle va con los rótulos escritos; en la tarjeta del feed, sólo los
 * valores en un renglón.
 * El multiplicador va en verde porque no es un lado —es lo que se cobra— y en
 * azul o naranja se confundiría con haber apostado a SÍ o a NO.
 */
export function MyPosition({
  side,
  amount,
  multiplier,
  compact = false,
}: {
  side: Side;
  amount: number;
  multiplier: number;
  compact?: boolean;
}) {
  const sideColor = side === 'YES' ? colors.yes : colors.no;
  const sideText = side === 'YES' ? 'SÍ' : 'NO';

  // En el feed la posición es un renglón más de la tarjeta, y ahí los rótulos
  // pesan más que lo que aclaran: al lado del pozo y de la barra, "50 pts · SÍ"
  // ya se lee como la apuesta propia. Van sólo los valores, separados por
  // puntos medios y con el lado y el multiplicador en su color.
  if (compact) {
    return (
      <Animated.Text
        entering={FadeIn.duration(motion.duration.enter).easing(easeOut)}
        style={styles.positionText}
      >
        {points(amount)} pts <Text style={styles.sep}>·</Text>{' '}
        <Text style={{ fontWeight: '700', color: sideColor }}>{sideText}</Text>{' '}
        <Text style={styles.sep}>·</Text> <Text style={styles.mult}>{multiplier.toFixed(2)}×</Text>
      </Animated.Text>
    );
  }

  // En el detalle es un bloque propio, con los rótulos escritos y su caja gris.
  // Aparece fundiéndose porque aparece de verdad: antes de apostar este bloque
  // no existe, y la tarjeta que lo contiene crece para hacerle lugar. Sin el
  // fundido, confirmar una apuesta empuja media pantalla de un salto.
  return (
    <Animated.View
      entering={FadeIn.duration(motion.duration.enter).easing(easeOut)}
      style={styles.position}
    >
      <Text style={styles.positionText}>
        Tu apuesta: {points(amount)} a <Text style={{ fontWeight: '700', color: sideColor }}>
          {sideText}
        </Text>
      </Text>
      <Text style={styles.positionText}>
        Multiplicador actual: <Text style={styles.mult}>{multiplier.toFixed(2)}×</Text>
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  date: { ...t.small, color: colors.accent, fontWeight: '500' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leftText: { ...t.small, color: colors.muted },
  // El rótulo se centra contra la cifra en vez de apoyarse en su base: alineado
  // por la base queda colgando abajo del bloque del número, que es mucho más
  // alto que él. Va a 13 para emparejar con el tiempo restante del otro extremo
  // del renglón, y en `muted` porque acá titula a la cifra —no es un metadato
  // de tercer nivel que se mire de reojo.
  potWrap: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  potLabel: { ...t.label, fontSize: 13, color: colors.muted },
  pot: { ...t.numBig, color: colors.ink },
  potSmall: { ...t.num, fontSize: 17, color: colors.ink },
  position: {
    backgroundColor: colors.surfaceAlt,
    padding: space.md,
    borderRadius: radius.sm,
    gap: 2,
  },
  positionText: { ...t.small, color: colors.ink },
  sep: { color: colors.faint },
  mult: { fontWeight: '700', color: colors.gain, fontVariant: ['tabular-nums'] },
});

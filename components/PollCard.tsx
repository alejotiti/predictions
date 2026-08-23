import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, type as t } from '../theme';
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
}: {
  poll: PollWithBets;
  names: NameMap;
  userId: string | null;
  /** Comentarios que no viste. Sale del feed, que lo pide contado a la base. */
  unread?: number;
}) {
  const router = useRouter();
  const pool = poolOf(poll.bets);
  const mine = myBetIn(poll.bets, userId);
  const status = effectiveStatus(poll.status, poll.betting_closes_at);
  const left = timeLeft(poll.betting_closes_at);

  return (
    <Pressable onPress={() => router.push(`/poll/${poll.id}`)}>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  title: { ...t.title, color: colors.ink },
  by: { ...t.small, fontSize: 12, color: colors.muted },
});

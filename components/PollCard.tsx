import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, type as t } from '../theme';
import { Card, Pill } from './ui';
import { PoolBar } from './PoolBar';
import { useStore } from '../lib/mock/store';
import { effectiveStatus, statusLabel } from '../lib/domain/poll';
import { totalPool } from '../lib/domain/market';
import { points, timeLeft } from '../lib/format';
import { displayName, type Poll } from '../lib/mock/data';

export function PollCard({ poll }: { poll: Poll }) {
  const router = useRouter();
  const { poolOf, myBet } = useStore();
  const pool = poolOf(poll.id);
  const mine = myBet(poll.id);
  const status = effectiveStatus(poll.status, poll.bettingClosesAt);
  const left = timeLeft(poll.bettingClosesAt);

  return (
    <Pressable onPress={() => router.push(`/poll/${poll.id}`)}>
      <Card style={{ gap: space.md }}>
        <View style={styles.top}>
          <Text style={styles.title}>{poll.title}</Text>
        </View>

        <PoolBar pool={pool} myside={mine?.side} compact />

        <View style={styles.meta}>
          <Text style={styles.pot}>{points(totalPool(pool))} pts en juego</Text>
          {status === 'OPEN' && left ? (
            <Text style={styles.time}>cierra en {left}</Text>
          ) : (
            <Pill
              text={statusLabel[status]}
              tone={status === 'RESOLVED_YES' ? 'yes' : status === 'RESOLVED_NO' ? 'no' : 'neutral'}
            />
          )}
        </View>

        {mine && (
          <Text style={styles.mine}>
            Tu apuesta: {points(mine.amount)} a{' '}
            <Text style={{ color: mine.side === 'YES' ? colors.yes : colors.no, fontWeight: '700' }}>
              {mine.side === 'YES' ? 'SÍ' : 'NO'}
            </Text>
          </Text>
        )}

        <Text style={styles.by}>por {displayName(poll.creatorId)}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  title: { ...t.title, color: colors.ink, flex: 1, lineHeight: 26 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pot: { ...t.points, color: colors.ink },
  time: { ...t.body, fontSize: 13, color: colors.muted },
  mine: { ...t.body, fontSize: 13, color: colors.muted },
  by: { ...t.body, fontSize: 12, color: colors.muted },
});

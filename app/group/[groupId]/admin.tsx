import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, space, type as t } from '../../../theme';
import { Button, Card, Empty, Label, Pill } from '../../../components/ui';
import { useStore } from '../../../lib/mock/store';
import { displayName } from '../../../lib/mock/data';
import { points, shortDate } from '../../../lib/format';
import { totalPool } from '../../../lib/domain/market';

export default function AdminPanel() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { pollsOf, dispatch, isAdmin, poolOf, betsOf } = useStore();

  if (!isAdmin(groupId)) {
    return <Empty title="Esta pantalla es solo para el árbitro del grupo." />;
  }

  const polls = pollsOf(groupId);
  const toApprove = polls.filter((p) => p.status === 'PENDING_APPROVAL');
  const toResolve = polls.filter((p) => p.status === 'PENDING_RESULT');

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Label>Para aprobar</Label>
      {toApprove.length === 0 && <Text style={styles.none}>Nada pendiente.</Text>}
      {toApprove.map((p) => (
        <Card key={p.id} style={{ gap: space.md }}>
          <Text style={styles.title}>{p.title}</Text>
          {p.description && <Text style={styles.desc}>{p.description}</Text>}
          <Text style={styles.meta}>
            de {displayName(p.creatorId)} · cierra {shortDate(p.bettingClosesAt)}
          </Text>
          {p.subjectIds.length > 0 && (
            <Text style={styles.meta}>
              Involucra a {p.subjectIds.map(displayName).join(', ')}
            </Text>
          )}
          <Text style={styles.criterion}>
            ¿Alguno de los involucrados puede elegir el resultado después de ver la apuesta?
            Si puede elegirlo, rechazala. Si solo puede influir, aprobala.
          </Text>
          <View style={styles.actions}>
            <Button
              title="Aprobar"
              style={{ flex: 1 }}
              onPress={() => dispatch({ type: 'REVIEW_POLL', pollId: p.id, approve: true })}
            />
            <Button
              title="Rechazar"
              tone="ghost"
              style={{ flex: 1 }}
              onPress={() => dispatch({ type: 'REVIEW_POLL', pollId: p.id, approve: false })}
            />
          </View>
        </Card>
      ))}

      <Label>Para resolver</Label>
      {toResolve.length === 0 && <Text style={styles.none}>Nada pendiente.</Text>}
      {toResolve.map((p) => {
        const pool = poolOf(p.id);
        const n = betsOf(p.id).length;
        return (
          <Card key={p.id} style={{ gap: space.md }}>
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.meta}>
              {points(totalPool(pool))} pts de {n} {n === 1 ? 'apuesta' : 'apuestas'}
            </Text>
            {p.proposedOutcome && (
              <Pill
                text={`${displayName(p.proposedBy!)} propone ${p.proposedOutcome === 'YES' ? 'SÍ' : 'NO'}`}
                tone={p.proposedOutcome === 'YES' ? 'yes' : 'no'}
              />
            )}
            <View style={styles.actions}>
              <Button
                title="SÍ"
                tone="yes"
                style={{ flex: 1 }}
                onPress={() => dispatch({ type: 'RESOLVE_POLL', pollId: p.id, outcome: 'YES' })}
              />
              <Button
                title="NO"
                tone="no"
                style={{ flex: 1 }}
                onPress={() => dispatch({ type: 'RESOLVE_POLL', pollId: p.id, outcome: 'NO' })}
              />
            </View>
            <Button
              title="Anular y devolver todo"
              tone="ghost"
              onPress={() => dispatch({ type: 'RESOLVE_POLL', pollId: p.id, outcome: 'VOID' })}
            />
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  title: { ...t.title, fontSize: 17, color: colors.ink },
  desc: { ...t.body, fontSize: 13, color: colors.muted, lineHeight: 19 },
  meta: { ...t.body, fontSize: 12, color: colors.muted },
  criterion: {
    ...t.body,
    fontSize: 12,
    color: '#8A6100',
    backgroundColor: '#FFF3D6',
    padding: space.md,
    borderRadius: 8,
    lineHeight: 17,
  },
  actions: { flexDirection: 'row', gap: space.sm },
  none: { ...t.body, fontSize: 13, color: colors.muted },
});

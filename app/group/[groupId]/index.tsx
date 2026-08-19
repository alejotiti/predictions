import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, space, type as t } from '../../../theme';
import { Empty } from '../../../components/ui';
import { PollCard } from '../../../components/PollCard';
import { useStore } from '../../../lib/mock/store';
import { effectiveStatus, isResolved } from '../../../lib/domain/poll';
import { points } from '../../../lib/format';

export default function Feed() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { pollsOf, balance, isAdmin } = useStore();

  const all = pollsOf(groupId);
  const live = all.filter((p) => {
    const s = effectiveStatus(p.status, p.bettingClosesAt);
    return s === 'OPEN' || s === 'LOCKED' || s === 'PENDING_RESULT';
  });
  const done = all.filter((p) => isResolved(p.status));
  const pending = all.filter((p) => p.status === 'PENDING_APPROVAL').length;
  const toResolve = all.filter((p) => p.status === 'PENDING_RESULT').length;
  const admin = isAdmin(groupId);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.balanceRow}>
        <Text style={styles.balanceLabel}>Tu saldo</Text>
        <Text style={styles.balance}>{points(balance(groupId))} pts</Text>
      </View>

      {admin && (pending > 0 || toResolve > 0) && (
        <Pressable onPress={() => router.push(`/group/${groupId}/admin`)} style={styles.adminBar}>
          <Text style={styles.adminText}>
            {pending > 0 && `${pending} para aprobar`}
            {pending > 0 && toResolve > 0 && ' · '}
            {toResolve > 0 && `${toResolve} para resolver`}
          </Text>
          <Text style={styles.adminGo}>Abrir panel →</Text>
        </Pressable>
      )}

      {live.length === 0 && (
        <Empty title="No hay predicciones abiertas" hint="Creá la primera desde la pestaña Crear." />
      )}
      {live.map((p) => (
        <PollCard key={p.id} poll={p} />
      ))}

      {done.length > 0 && (
        <>
          <Text style={styles.section}>Historial</Text>
          {done.map((p) => (
            <PollCard key={p.id} poll={p} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  balanceLabel: { ...t.label, color: colors.muted, textTransform: 'uppercase' },
  balance: { ...t.points, fontSize: 18, color: colors.ink },
  adminBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF3D6',
    padding: space.md,
    borderRadius: 10,
  },
  adminText: { ...t.body, fontSize: 13, color: '#8A6100', fontWeight: '600' },
  adminGo: { ...t.body, fontSize: 13, color: '#8A6100', fontWeight: '700' },
  section: { ...t.label, color: colors.muted, marginTop: space.lg, textTransform: 'uppercase' },
});

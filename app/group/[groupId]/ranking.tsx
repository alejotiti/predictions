import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, space, type as t } from '../../../theme';
import { Card } from '../../../components/ui';
import { useStore } from '../../../lib/mock/store';
import { displayName } from '../../../lib/mock/data';
import { points } from '../../../lib/format';

export default function Ranking() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { membersOf, balance, me } = useStore();

  const rows = membersOf(groupId)
    .map((m) => ({ userId: m.userId, role: m.role, balance: balance(groupId, m.userId) }))
    .sort((a, b) => b.balance - a.balance || a.userId.localeCompare(b.userId));

  return (
    <ScrollView contentContainerStyle={styles.page}>
      {rows.map((r, i) => (
        <Card key={r.userId} style={[styles.row, r.userId === me && styles.rowMe]}>
          <Text style={styles.pos}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName(r.userId)}</Text>
            {r.role !== 'member' && <Text style={styles.role}>árbitro</Text>}
          </View>
          <Text style={styles.pts}>{points(r.balance)}</Text>
        </Card>
      ))}
      <Text style={styles.note}>Ordenado por saldo de puntos del grupo.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  rowMe: { borderColor: colors.ink },
  pos: { ...t.points, fontSize: 13, color: colors.muted, width: 22 },
  name: { ...t.body, fontWeight: '600', color: colors.ink },
  role: { ...t.body, fontSize: 11, color: colors.muted },
  pts: { ...t.points, fontSize: 16, color: colors.ink },
  note: { ...t.body, fontSize: 12, color: colors.muted, marginTop: space.md },
});

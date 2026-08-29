import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { colors, radius, space, type as t } from '../../../theme';
import { Button, Card, Empty, Label, Pill } from '../../../components/ui';
import { AdminCardSkeleton } from '../../../components/Skeleton';
import { useGroupFeed, poolOf, reviewPoll, resolvePoll } from '../../../lib/predictions';
import { useGroupId } from '../../../lib/groups';
import { nameOf } from '../../../lib/profiles';
import { points, shortDate } from '../../../lib/format';
import { totalPool, type Side } from '../../../lib/domain/market';

export default function AdminPanel() {
  const groupId = useGroupId();
  const { polls, names, isAdmin, status, error, refreshing, refresh, pullToRefresh } =
    useGroupFeed(groupId);
  // Qué poll está esperando respuesta del servidor, para no dejar apretar dos veces.
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // La pantalla se esconde por prolijidad; el que de verdad corta el paso es el
  // `is_group_admin` de las RPC (§15).
  if (status === 'ready' && !isAdmin) {
    return <Empty title="Esta pantalla es solo para el árbitro del grupo." />;
  }

  const loading = status === 'loading';
  const toApprove = polls.filter((p) => p.status === 'PENDING_APPROVAL');
  const toResolve = polls.filter((p) => p.status === 'PENDING_RESULT');

  async function run(pollId: string, action: () => Promise<void>) {
    setBusy(pollId);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No pudimos completar la acción.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={pullToRefresh} tintColor={colors.muted} />
      }
    >
      {(status === 'error' || actionError) && (
        <Card style={{ gap: space.md }}>
          <Text style={styles.errorText}>{actionError ?? error}</Text>
          <Button title="Reintentar" tone="ghost" onPress={refresh} />
        </Card>
      )}

      <Label>Para aprobar</Label>
      {/* "Nada pendiente" recién con la consulta terminada: si no, el árbitro
          lee que no tiene trabajo justo mientras se está cargando el que tiene. */}
      {loading && <AdminCardSkeleton />}
      {!loading && toApprove.length === 0 && <Text style={styles.none}>Nada pendiente.</Text>}
      {toApprove.map((p) => (
        <Card key={p.id} style={{ gap: space.lg }}>
          {/* La predicción: qué se pregunta y cómo se decide. */}
          <View style={{ gap: space.xs }}>
            <Text style={styles.title}>{p.title}</Text>
            {p.description && <Text style={styles.desc}>{p.description}</Text>}
          </View>
          {/* Quién y cuándo: dos renglones del mismo registro, van pegados. */}
          <View style={{ gap: 2 }}>
            <Text style={styles.meta}>
              de {nameOf(names, p.creator_id)} · cierra {shortDate(p.betting_closes_at)}
            </Text>
            {p.subject_ids.length > 0 && (
              <Text style={styles.meta}>
                Involucra a {p.subject_ids.map((id) => nameOf(names, id)).join(', ')}
              </Text>
            )}
          </View>
          <Text style={styles.criterion}>
            ¿Alguno de los involucrados puede elegir el resultado después de ver la apuesta?
            Si puede elegirlo, rechazala. Si solo puede influir, aprobala.
          </Text>
          <View style={styles.actions}>
            <Button
              title="Aprobar"
              style={{ flex: 1 }}
              disabled={busy === p.id}
              onPress={() => run(p.id, () => reviewPoll(p.id, true))}
            />
            <Button
              title="Rechazar"
              tone="ghost"
              style={{ flex: 1 }}
              disabled={busy === p.id}
              onPress={() => run(p.id, () => reviewPoll(p.id, false))}
            />
          </View>
        </Card>
      ))}

      <Label>Para resolver</Label>
      {loading && <AdminCardSkeleton />}
      {!loading && toResolve.length === 0 && <Text style={styles.none}>Nada pendiente.</Text>}
      {toResolve.map((p) => {
        const pool = poolOf(p.bets);
        const n = p.bets.length;
        return (
          <Card key={p.id} style={{ gap: space.lg }}>
            <View style={{ gap: space.xs }}>
              <Text style={styles.title}>{p.title}</Text>
              <Text style={styles.meta}>
                {points(totalPool(pool))} pts de {n} {n === 1 ? 'apuesta' : 'apuestas'}
              </Text>
            </View>
            {p.proposed_outcome && (
              <Pill
                text={`${p.proposed_by ? nameOf(names, p.proposed_by) : 'Alguien'} propone ${
                  p.proposed_outcome === 'YES' ? 'SÍ' : 'NO'
                }`}
                tone={p.proposed_outcome === 'YES' ? 'yes' : 'no'}
              />
            )}
            <View style={{ gap: space.md }}>
            <View style={styles.actions}>
              {(['YES', 'NO'] as Side[]).map((side) => (
                <Button
                  key={side}
                  title={side === 'YES' ? 'SÍ' : 'NO'}
                  tone={side === 'YES' ? 'yes' : 'no'}
                  style={{ flex: 1 }}
                  disabled={busy === p.id}
                  onPress={() => run(p.id, () => resolvePoll(p.id, side))}
                />
              ))}
            </View>
            <Button
              title="Anular y devolver todo"
              tone="ghost"
              disabled={busy === p.id}
              onPress={() => run(p.id, () => resolvePoll(p.id, 'VOID'))}
            />
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Mismo criterio que el feed: entre tarjetas, más aire que adentro de una.
  page: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
  title: { ...t.title, color: colors.ink },
  desc: { ...t.small, color: colors.muted },
  meta: { ...t.small, fontSize: 12, color: colors.faint },
  criterion: {
    ...t.small,
    fontSize: 12,
    color: colors.warn,
    backgroundColor: colors.warnSoft,
    padding: space.md,
    borderRadius: radius.sm,
    lineHeight: 17,
  },
  actions: { flexDirection: 'row', gap: space.md },
  none: { ...t.small, color: colors.faint },
  errorText: { ...t.body, color: colors.danger },
});

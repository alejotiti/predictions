import { useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { colors, radius, space, type as t } from '../../../theme';
import { Button, Card, Empty, Label } from '../../../components/ui';
import { HeaderBalance } from '../../../components/HeaderBalance';
import { PollCardSkeleton } from '../../../components/Skeleton';
import { PollCard } from '../../../components/PollCard';
import { PendingOutcomeCard } from '../../../components/PendingOutcomeCard';
import { useGroupFeed } from '../../../lib/predictions';
import { useGroupId } from '../../../lib/groups';
import { effectiveStatus, isResolved, nextDeadline } from '../../../lib/domain/poll';

export default function Feed() {
  const groupId = useGroupId();
  const router = useRouter();
  const navigation = useNavigation();
  const { polls, balance, isAdmin, userId, names, status, error, refreshing, refresh, pullToRefresh } =
    useGroupFeed(groupId);

  // Un solo reloj para todo el render: si cada llamada tomara la hora por su
  // cuenta, una poll que vence justo ahora podría filtrarse con un estado y
  // ordenarse con otro.
  const now = Date.now();
  // Las predicciones tuyas con las apuestas ya cerradas: son las únicas en las
  // que el que tiene que hacer algo sos vos. Van arriba de todo con los dos
  // botones a mano, en vez de escondidas adentro del detalle. `LOCKED` no
  // existe en la base —lo pone `effectiveStatus` cuando pasó el cierre y la
  // poll sigue OPEN—, que es exactamente lo que exige `propose_outcome`.
  const toAnswer = polls.filter(
    (p) =>
      p.creator_id === userId &&
      effectiveStatus(p.status, p.betting_closes_at, now) === 'LOCKED',
  );
  const answering = new Set(toAnswer.map((p) => p.id));
  const live = polls
    .filter((p) => {
      const s = effectiveStatus(p.status, p.betting_closes_at, now);
      // Las que están arriba esperando tu resultado no se repiten acá abajo.
      return !answering.has(p.id) && (s === 'OPEN' || s === 'LOCKED' || s === 'PENDING_RESULT');
    })
    // Primero lo que se define antes. Con dos vencimientos iguales manda el
    // orden en que vino la consulta, que es la más nueva arriba.
    .sort((a, b) => nextDeadline(a, now) - nextDeadline(b, now));
  // El historial no tiene nada por vencer: ahí sigue mandando lo más reciente.
  const done = polls.filter((p) => isResolved(p.status));
  const pending = polls.filter((p) => p.status === 'PENDING_APPROVAL').length;
  const toResolve = polls.filter((p) => p.status === 'PENDING_RESULT').length;

  const loading = status === 'loading';
  const failed = status === 'error';

  // El saldo va al header, en el mismo lugar y con la misma forma que en el
  // detalle de una predicción (DESIGN.md). Las opciones del header las pone el
  // layout de las pestañas, así que desde acá se actualizan por navigation.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderBalance balance={balance} loading={loading} />,
    });
  }, [navigation, balance, loading]);

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={pullToRefresh} tintColor={colors.muted} />
      }
    >
      {loading && (
        <>
          <PollCardSkeleton />
          <PollCardSkeleton />
          <PollCardSkeleton />
        </>
      )}

      {failed && (
        <Card style={{ gap: space.md }}>
          <Text style={styles.errorText}>{error ?? 'No pudimos cargar las predicciones.'}</Text>
          <Button title="Reintentar" tone="ghost" onPress={refresh} />
        </Card>
      )}

      {/* Arriba de todo, antes que el panel del árbitro y que el feed: lo que
          está esperando que vos digas cómo terminó. */}
      {toAnswer.length > 0 && (
        <>
          <Label>{toAnswer.length === 1 ? 'Espera tu resultado' : 'Esperan tu resultado'}</Label>
          {toAnswer.map((p) => (
            <PendingOutcomeCard key={p.id} poll={p} onProposed={refresh} />
          ))}
        </>
      )}

      {isAdmin && (pending > 0 || toResolve > 0) && (
        <Pressable onPress={() => router.push(`/group/${groupId}/admin`)} style={styles.adminBar}>
          <Text style={styles.adminText}>
            {pending > 0 && `${pending} para aprobar`}
            {pending > 0 && toResolve > 0 && ' · '}
            {toResolve > 0 && `${toResolve} para resolver`}
          </Text>
          <Text style={styles.adminGo}>Abrir panel →</Text>
        </Pressable>
      )}

      {status === 'ready' && live.length === 0 && toAnswer.length === 0 && (
        <Empty title="No hay predicciones abiertas" hint="Creá la primera desde la pestaña Crear." />
      )}
      {live.map((p) => (
        <PollCard key={p.id} poll={p} names={names} userId={userId} />
      ))}

      {done.length > 0 && (
        <>
          <View style={styles.section}>
            <Label>Historial</Label>
          </View>
          {done.map((p) => (
            <PollCard key={p.id} poll={p} names={names} userId={userId} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  errorText: { ...t.body, color: colors.danger },
  adminBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.warnSoft,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.sm,
  },
  adminText: { ...t.small, color: colors.warn, fontWeight: '600' },
  adminGo: { ...t.small, color: colors.warn, fontWeight: '700' },
  section: { marginTop: space.lg },
});

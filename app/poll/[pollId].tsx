import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, space, type as t } from '../../theme';
import { Button, Card, Empty, Label, Pill } from '../../components/ui';
import { PoolBar } from '../../components/PoolBar';
import { BetSheet } from '../../components/BetSheet';
import { Chat } from '../../components/Chat';
import { useStore } from '../../lib/mock/store';
import { effectiveStatus, statusLabel } from '../../lib/domain/poll';
import { estimatedPayout, totalPool, type Side } from '../../lib/domain/market';
import { displayName } from '../../lib/mock/data';
import { points, shortDate, timeLeft } from '../../lib/format';

export default function PollDetail() {
  const { pollId } = useLocalSearchParams<{ pollId: string }>();
  const { state, poolOf, myBet, balance, dispatch, me, isAdmin } = useStore();
  const [sheetSide, setSheetSide] = useState<Side | null>(null);

  const poll = state.polls.find((p) => p.id === pollId);
  if (!poll) return <Empty title="Esta predicción ya no existe." />;

  const pool = poolOf(poll.id);
  const mine = myBet(poll.id);
  const status = effectiveStatus(poll.status, poll.bettingClosesAt);
  const left = timeLeft(poll.bettingClosesAt);
  const bal = balance(poll.groupId);
  const canBet = status === 'OPEN';
  const myPayout = mine ? estimatedPayout(pool, mine.side, 0, mine.amount) : 0;

  function open(side: Side) {
    // no se puede cambiar de lado (§4.2)
    if (mine && mine.side !== side) return;
    setSheetSide(side);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{poll.title}</Text>
        {poll.description && <Text style={styles.desc}>{poll.description}</Text>}

        <View style={styles.metaRow}>
          {status === 'OPEN' && left ? (
            <Text style={styles.time}>Cierra en {left}</Text>
          ) : (
            <Pill
              text={statusLabel[status]}
              tone={status === 'RESOLVED_YES' ? 'yes' : status === 'RESOLVED_NO' ? 'no' : 'neutral'}
            />
          )}
          <Text style={styles.time}>{shortDate(poll.bettingClosesAt)}</Text>
        </View>

        <Card style={{ gap: space.lg }}>
          <View style={styles.potRow}>
            <Label>Pozo</Label>
            <Text style={styles.pot}>{points(totalPool(pool))} pts</Text>
          </View>

          <PoolBar pool={pool} myside={mine?.side} />

          {mine && (
            <View style={styles.position}>
              <Text style={styles.positionText}>
                Tu apuesta: {points(mine.amount)} a{' '}
                <Text style={{ fontWeight: '700', color: mine.side === 'YES' ? colors.yes : colors.no }}>
                  {mine.side === 'YES' ? 'SÍ' : 'NO'}
                </Text>
              </Text>
              <Text style={styles.positionText}>
                Si ganás cobrás ~{points(myPayout)} pts
              </Text>
            </View>
          )}

          {canBet ? (
            <>
              <View style={styles.actions}>
                <Button
                  title={mine?.side === 'NO' ? 'SÍ bloqueado' : 'Apostar SÍ'}
                  tone="yes"
                  disabled={mine?.side === 'NO'}
                  style={{ flex: 1 }}
                  onPress={() => open('YES')}
                />
                <Button
                  title={mine?.side === 'YES' ? 'NO bloqueado' : 'Apostar NO'}
                  tone="no"
                  disabled={mine?.side === 'YES'}
                  style={{ flex: 1 }}
                  onPress={() => open('NO')}
                />
              </View>
              <Text style={styles.balanceHint}>Saldo disponible: {points(bal)} pts</Text>
              {mine && (
                <Text style={styles.balanceHint}>
                  Ya estás del lado {mine.side === 'YES' ? 'SÍ' : 'NO'}: podés sumar más puntos,
                  no cambiar de lado.
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.closed}>
              {status === 'PENDING_APPROVAL'
                ? 'Esperando que el árbitro la apruebe.'
                : status === 'REJECTED'
                  ? 'El árbitro la rechazó. No se puede apostar.'
                  : status === 'VOID'
                    ? 'Anulada: se devolvió cada apuesta completa.'
                    : 'Las apuestas están cerradas.'}
            </Text>
          )}
        </Card>

        {status === 'LOCKED' && poll.creatorId === me && (
          <Card style={{ gap: space.md }}>
            <Label>Ya pasó el evento</Label>
            <Text style={styles.desc}>
              Proponé el resultado. Lo confirma el árbitro antes de pagar.
            </Text>
            <View style={styles.actions}>
              <Button
                title="Pasó: SÍ"
                tone="yes"
                style={{ flex: 1 }}
                onPress={() => dispatch({ type: 'PROPOSE_OUTCOME', pollId: poll.id, outcome: 'YES' })}
              />
              <Button
                title="No pasó: NO"
                tone="no"
                style={{ flex: 1 }}
                onPress={() => dispatch({ type: 'PROPOSE_OUTCOME', pollId: poll.id, outcome: 'NO' })}
              />
            </View>
          </Card>
        )}

        {poll.subjectIds.length > 0 && (
          <Text style={styles.subjects}>
            Involucra a {poll.subjectIds.map(displayName).join(', ')}
          </Text>
        )}

        <Text style={styles.chatHeading}>Comentarios</Text>
        <Chat pollId={poll.id} />
      </ScrollView>

      {sheetSide && (
        <BetSheet
          visible
          side={sheetSide}
          pool={pool}
          balance={bal}
          currentStake={mine?.side === sheetSide ? mine.amount : 0}
          onClose={() => setSheetSide(null)}
          onConfirm={(amount) => {
            dispatch({ type: 'PLACE_BET', pollId: poll.id, side: sheetSide, amount });
            setSheetSide(null);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  title: { ...t.title, fontSize: 24, color: colors.ink, lineHeight: 31 },
  desc: { ...t.body, color: colors.muted, lineHeight: 21 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { ...t.body, fontSize: 13, color: colors.muted },
  potRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  pot: { ...t.pointsBig, color: colors.ink },
  position: {
    backgroundColor: colors.surfaceAlt,
    padding: space.md,
    borderRadius: 8,
    gap: 3,
  },
  positionText: { ...t.body, fontSize: 13, color: colors.ink },
  actions: { flexDirection: 'row', gap: space.sm },
  balanceHint: { ...t.body, fontSize: 12, color: colors.muted },
  closed: { ...t.body, fontSize: 13, color: colors.muted },
  subjects: { ...t.body, fontSize: 12, color: colors.muted },
  chatHeading: { ...t.label, color: colors.muted, marginTop: space.lg, textTransform: 'uppercase' },
});

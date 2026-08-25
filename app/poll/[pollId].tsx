import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { colors, space, type as t } from '../../theme';
import { Button, Card, Empty, Label } from '../../components/ui';
import { HeaderBalance } from '../../components/HeaderBalance';
import { ScreenHeader } from '../../components/ScreenHeader';
import { PoolBar } from '../../components/PoolBar';
import { CloseDate, MyPosition, StatusRow } from '../../components/PollParts';
import { BetSheet } from '../../components/BetSheet';
import { ChatMessages, ChatComposer } from '../../components/Chat';
import { PollDetailSkeleton } from '../../components/Skeleton';
import { usePoll, poolOf, placeBet, proposeOutcome, markPollRead } from '../../lib/predictions';
import { nameOf } from '../../lib/profiles';
import { effectiveStatus } from '../../lib/domain/poll';
import { estimatedMultiplier, totalPool, type Side } from '../../lib/domain/market';
import { timeLeft } from '../../lib/format';

export default function PollDetail() {
  const { pollId } = useLocalSearchParams<{ pollId: string }>();
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const {
    poll,
    bets,
    messages,
    balance,
    names,
    myBet: mine,
    userId,
    status: loadStatus,
    error: loadError,
    refresh,
  } = usePoll(pollId);
  const [sheetSide, setSheetSide] = useState<Side | null>(null);
  // La hoja se va animada, así que sigue en pantalla un rato después de que
  // `sheetSide` vuelve a null: mientras baja necesita saber a qué lado era.
  const lastSide = useRef<Side>('YES');
  if (sheetSide) lastSide.current = sheetSide;
  const openSide = sheetSide ?? lastSide.current;
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Estar en esta pantalla es haber visto los comentarios: se apaga el punto de
  // la tarjeta del feed, y sólo para vos. Se vuelve a marcar cuando cambia la
  // cantidad de mensajes —al mandar uno, o al recargar por foco con algo
  // nuevo—, porque en ese momento ya los estás mirando. El hook va acá arriba,
  // antes de los returns de carga y error, que es donde tienen que estar todos.
  const messageCount = messages.length;
  useEffect(() => {
    if (!pollId || loadStatus !== 'ready') return;
    void markPollRead(pollId);
  }, [pollId, messageCount, loadStatus]);

  // Header propio en vez del nativo: es lo que hace que la burbuja del saldo se
  // vea igual acá que en "Inicio". El porqué está en components/ScreenHeader.
  // El saldo va puesto desde el primer frame, con su hueso mientras carga: si
  // apareciera recién con los datos, el header saltaría.
  const chrome = (
    <ScreenHeader
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      right={<HeaderBalance balance={balance} loading={loadStatus === 'loading'} />}
    />
  );

  if (loadStatus === 'loading') {
    return (
      <View style={styles.fill}>
        {chrome}
        <PollDetailSkeleton />
      </View>
    );
  }
  if (loadStatus === 'error') {
    return (
      <View style={styles.fill}>
        {chrome}
        <Empty title="No pudimos cargar la predicción." hint={loadError ?? undefined} />
      </View>
    );
  }
  if (!poll) {
    return (
      <View style={styles.fill}>
        {chrome}
        <Empty title="Esta predicción ya no existe." />
      </View>
    );
  }

  const pool = poolOf(bets);
  const status = effectiveStatus(poll.status, poll.betting_closes_at);
  const left = timeLeft(poll.betting_closes_at);
  const canBet = status === 'OPEN';
  // Sin saldo no hay nada que apostar: ni abrir la primera posición ni sumarle
  // puntos a la que ya tenés. El botón se apaga acá para no ofrecer algo que
  // la RPC va a rechazar igual.
  const broke = balance <= 0;

  function open(side: Side) {
    // no se puede cambiar de lado (§4.2)
    if (mine && mine.side !== side) return;
    if (broke) return;
    setActionError(null);
    setSheetSide(side);
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No pudimos completar la acción.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // Con el header nativo apagado, `useHeaderHeight()` da 0 y el padre del
      // KeyboardAvoidingView arranca arriba de todo, así que no hay header que
      // restar. Queda la resta del inset de abajo, que ya lo pone el
      // compositor: sin eso quedaría el hueco del home indicator entre el campo
      // y el teclado. La cuenta se deja escrita entera para que siga dando bien
      // si algún día el header vuelve a ser el nativo.
      keyboardVerticalOffset={headerHeight - insets.bottom}
    >
      {chrome}

      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {/* El título, su fecha de cierre y la descripción son una sola cosa: la
            pregunta. Van juntos y lo que los separa de la tarjeta del mercado
            es el hueco grande de la página. */}
        <View style={styles.head}>
          <View style={{ gap: 2 }}>
            <Text style={styles.title}>{poll.title}</Text>
            <CloseDate iso={poll.betting_closes_at} />
          </View>
          {poll.description && <Text style={styles.desc}>{poll.description}</Text>}
        </View>

        <Card style={{ gap: space.lg }}>
          {/* Igual que en la tarjeta del feed: el pozo y su reparto son un solo
              dato en dos renglones. */}
          <View style={{ gap: space.sm }}>
            <StatusRow status={status} left={left} pool={totalPool(pool)} />
            <PoolBar pool={pool} />
          </View>

          {mine && (
            <MyPosition
              side={mine.side}
              amount={mine.amount}
              multiplier={estimatedMultiplier(pool, mine.side, 0, mine.amount)}
            />
          )}

          {actionError && <Text style={styles.actionError}>{actionError}</Text>}
          {/* El error queda pegado a los botones porque habla de ellos: es lo
              que pasó al tocarlos, no un aviso de la pantalla. */}

          {canBet ? (
            <>
              {/*
                No se puede cambiar de lado (§4.2), así que una vez que hay
                posición el otro botón no va a andar nunca más. Desteñido se
                lee como algo que se podría tocar y no responde: mejor que
                desaparezca y quede uno solo, del color del lado ya elegido,
                que dice lo único que se puede hacer —sumarle puntos.
              */}
              {mine ? (
                <Button
                  title={`Sumar puntos al ${mine.side === 'YES' ? 'SÍ' : 'NO'}`}
                  tone={mine.side === 'YES' ? 'yes' : 'no'}
                  disabled={broke || busy}
                  onPress={() => open(mine.side)}
                />
              ) : (
                <View style={styles.actions}>
                  <Button
                    title="Apostar SÍ"
                    tone="yes"
                    disabled={broke || busy}
                    style={{ flex: 1 }}
                    onPress={() => open('YES')}
                  />
                  <Button
                    title="Apostar NO"
                    tone="no"
                    disabled={broke || busy}
                    style={{ flex: 1 }}
                    onPress={() => open('NO')}
                  />
                </View>
              )}
              {broke && (
                <Text style={styles.closed}>
                  Te quedaste sin puntos. Vas a poder apostar de nuevo cuando cobres una
                  predicción.
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

        {status === 'LOCKED' && poll.creator_id === userId && (
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
                disabled={busy}
                onPress={() => run(() => proposeOutcome(poll.id, 'YES'))}
              />
              <Button
                title="No pasó: NO"
                tone="no"
                style={{ flex: 1 }}
                disabled={busy}
                onPress={() => run(() => proposeOutcome(poll.id, 'NO'))}
              />
            </View>
          </Card>
        )}

        {poll.subject_ids.length > 0 && (
          <Text style={styles.subjects}>
            Involucra a {poll.subject_ids.map((id) => nameOf(names, id)).join(', ')}
          </Text>
        )}

        <View style={styles.chatHeading}>
          <Label>Comentarios</Label>
        </View>
        <ChatMessages messages={messages} names={names} userId={userId} />
      </ScrollView>

      {/* Fuera del scroll: así el campo y el botón de enviar quedan siempre
          justo arriba del teclado, sin tener que bajarlo para mandar. */}
      <View style={{ paddingBottom: insets.bottom }}>
        <ChatComposer pollId={poll.id} onSent={refresh} />
      </View>

      <BetSheet
        visible={!!sheetSide}
        side={openSide}
        pool={pool}
        balance={balance}
        currentStake={mine?.side === openSide ? mine.amount : 0}
        onClose={() => setSheetSide(null)}
        onConfirm={(amount) => {
          setSheetSide(null);
          void run(() => placeBet(poll.id, openSide, amount));
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Los grupos de la página van al doble del hueco que tienen adentro (8), por
  // lo mismo que en la tarjeta del feed. Antes todo iba a 12 y la pregunta, el
  // mercado y los comentarios se leían como tres párrafos de lo mismo.
  page: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  head: { gap: space.sm },
  title: { ...t.h1, color: colors.ink },
  desc: { ...t.body, color: colors.muted },
  // Apostar SÍ y Apostar NO son opciones OPUESTAS, y a 8 de distancia se leían
  // como un solo control partido al medio. El hueco es lo que dice que hay que
  // elegir uno.
  actions: { flexDirection: 'row', gap: space.md },
  actionError: { ...t.small, color: colors.danger },
  closed: { ...t.small, color: colors.muted },
  subjects: { ...t.small, fontSize: 12, color: colors.faint },
  chatHeading: { marginTop: space.lg },
});

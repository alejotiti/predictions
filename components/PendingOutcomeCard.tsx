import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, motion, space, type as t } from '../theme';

const easeOut = Easing.bezier(...motion.bezier.out);
import { Button, Card, UnreadDot } from './ui';
import { proposeOutcome } from '../lib/predictions';
import { shortDate } from '../lib/format';
import type { Poll } from '../lib/db/types';
import type { Side } from '../lib/domain/market';

/**
 * Una predicción tuya con las apuestas ya cerradas, arriba de todo en Inicio:
 * el nombre arriba y el resultado abajo, partido en dos.
 *
 * Antes el aviso vivía sólo adentro del detalle de la poll, así que para
 * enterarte de que te estaban esperando había que entrar a mirarla. Acá el
 * trabajo aparece apenas se abre el grupo, con lo justo para contestar sin
 * moverse.
 *
 * Las dos mitades no hacen lo mismo: la de arriba lleva al detalle para el que
 * quiera ver el pozo o los comentarios antes de decidir; la de abajo decide.
 * Los botones dicen sólo SÍ y NO: la pregunta ya está escrita justo arriba, así
 * que repetirla adentro de cada uno es contestar dos veces lo mismo. Son los
 * mismos dos botones del panel del árbitro, que responde esa misma pregunta.
 */
export function PendingOutcomeCard({
  poll,
  onProposed,
  unread = 0,
}: {
  poll: Poll;
  /** Para que el feed se recargue y la tarjeta se vaya sola. */
  onProposed: () => Promise<void>;
  /**
   * El mismo punto que en `PollCard`, y por la misma razón: es la misma
   * predicción con otra cara. Si sólo lo tuviera la otra tarjeta, cerrar las
   * apuestas apagaría el aviso de un comentario sin leer.
   */
  unread?: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(outcome: Side) {
    setBusy(true);
    setError(null);
    try {
      await proposeOutcome(poll.id, outcome);
      await onProposed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos proponer el resultado.');
      // Sólo si falló: si salió bien, la tarjeta ya no existe y tocar el estado
      // de un componente desmontado no hace más que avisar por consola.
      setBusy(false);
    }
  }

  return (
    // Entra antes que el feed y sin esperar turno: es lo único de la pantalla
    // donde el que tiene que hacer algo sos vos. Y se va fundiéndose cuando
    // contestás, que es la confirmación de que quedó contestada —el feed de
    // abajo sube solo a ocupar el lugar.
    <Animated.View
      entering={FadeInDown.duration(motion.duration.enter).easing(easeOut)}
      exiting={FadeOut.duration(motion.duration.enter).easing(easeOut)}
    >
    <Card style={{ gap: space.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver ${poll.title}`}
        onPress={() => router.push(`/poll/${poll.id}`)}
        style={({ pressed }) => [styles.head, { opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { flex: 1 }]}>{poll.title}</Text>
          <UnreadDot count={unread} />
        </View>
        <Text style={styles.meta}>cerró {shortDate(poll.betting_closes_at)}</Text>
      </Pressable>

      <Text style={styles.ask}>¿Pasó? Lo confirma el árbitro antes de pagar.</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Button
          title="SÍ"
          tone="yes"
          style={{ flex: 1 }}
          disabled={busy}
          onPress={() => void choose('YES')}
        />
        <Button
          title="NO"
          tone="no"
          style={{ flex: 1 }}
          disabled={busy}
          onPress={() => void choose('NO')}
        />
      </View>
    </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  head: { gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  title: { ...t.title, color: colors.ink },
  meta: { ...t.small, fontSize: 12, color: colors.faint },
  ask: { ...t.small, color: colors.muted },
  error: { ...t.small, color: colors.danger },
  actions: { flexDirection: 'row', gap: space.sm },
});

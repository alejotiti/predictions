import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, type as t } from '../theme';
import { Button, Card } from './ui';
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
}: {
  poll: Poll;
  /** Para que el feed se recargue y la tarjeta se vaya sola. */
  onProposed: () => Promise<void>;
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
    <Card style={{ gap: space.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver ${poll.title}`}
        onPress={() => router.push(`/poll/${poll.id}`)}
        style={({ pressed }) => [styles.head, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={styles.title}>{poll.title}</Text>
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
  );
}

const styles = StyleSheet.create({
  head: { gap: 2 },
  title: { ...t.title, color: colors.ink },
  meta: { ...t.small, fontSize: 12, color: colors.faint },
  ask: { ...t.small, color: colors.muted },
  error: { ...t.small, color: colors.danger },
  actions: { flexDirection: 'row', gap: space.sm },
});

import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { colors, control, radius, space, type as t } from '../theme';
import { PaperAirplaneIcon } from './icons';
import { sendPollMessage } from '../lib/predictions';
import { nameOf, type NameMap } from '../lib/profiles';
import type { Message } from '../lib/db/types';

/**
 * El chat viene partido en dos a propósito: los mensajes van adentro del scroll
 * de la pantalla y el compositor queda anclado abajo, pegado al teclado. Si el
 * compositor viviera dentro del scroll habría que bajar el teclado para poder
 * verlo, que es justo lo que no queremos.
 *
 * Los mensajes vienen embebidos con la poll, así que acá no se consulta nada:
 * sólo se envía y se le avisa a la pantalla para que recargue.
 */
export function ChatMessages({
  messages,
  names,
  userId,
}: {
  messages: Message[];
  names: NameMap;
  userId: string | null;
}) {
  return (
    <View style={{ gap: space.md }}>
      {messages.length === 0 && (
        <Text style={styles.empty}>Nadie dijo nada todavía. Empezá vos.</Text>
      )}
      {messages.map((m) => {
        const own = m.user_id === userId;
        return (
          <View key={m.id} style={[styles.bubble, own && styles.bubbleOwn]}>
            {!own && <Text style={styles.author}>{nameOf(names, m.user_id)}</Text>}
            <Text style={[styles.body, own && { color: '#fff' }]}>{m.body}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function ChatComposer({ pollId, onSent }: { pollId: string; onSent: () => void }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendPollMessage(pollId, body);
      // Recién se limpia con el mensaje ya guardado: si falla, no se perdió.
      setDraft('');
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos enviar el mensaje.');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.bar}>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Escribir en la poll"
          placeholderTextColor={colors.faint}
          style={styles.input}
          onSubmitEditing={send}
          returnKeyType="send"
          // El teclado se queda puesto después de enviar: lo normal es escribir
          // dos mensajes seguidos, no uno y cerrar.
          submitBehavior="submit"
          editable={!sending}
        />
        <Pressable
          onPress={send}
          disabled={sending}
          style={({ pressed }) => [styles.send, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          // El ícono no dice "enviar" solo: sin esta etiqueta el lector de
          // pantalla anuncia un botón sin nombre.
          accessibilityLabel="Enviar"
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <PaperAirplaneIcon color="#fff" size={20} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { ...t.small, color: colors.faint },
  bubble: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderRadius: radius.lg,
    alignSelf: 'flex-start',
    maxWidth: '85%',
    gap: 2,
  },
  bubbleOwn: { backgroundColor: colors.ink, alignSelf: 'flex-end' },
  author: { ...t.label, color: colors.faint },
  body: { ...t.body, fontSize: 14, color: colors.ink, lineHeight: 19 },
  error: { ...t.small, color: colors.danger },
  // Sin línea divisoria: al compositor lo separa el aire y la sombra del
  // campo, no un filete gris cruzando la pantalla.
  bar: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    backgroundColor: colors.paper,
  },
  composer: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: {
    flex: 1,
    ...t.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    minHeight: control.sendSize,
    paddingVertical: 12,
  },
  // Redondo y del alto del campo: ahora que es un ícono y no una palabra, el
  // botón no tiene que crecer con el texto.
  send: {
    width: control.sendSize,
    height: control.sendSize,
    borderRadius: control.sendSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
});

import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { colors, radius, space, type as t } from '../theme';
import { useStore } from '../lib/mock/store';
import { displayName } from '../lib/mock/data';

export function Chat({ pollId }: { pollId: string }) {
  const { messagesOf, dispatch, me } = useStore();
  const [draft, setDraft] = useState('');
  const msgs = messagesOf(pollId);

  function send() {
    const body = draft.trim();
    if (!body) return;
    dispatch({ type: 'SEND_MESSAGE', pollId, body });
    setDraft('');
  }

  return (
    <View style={{ gap: space.md }}>
      {msgs.length === 0 && <Text style={styles.empty}>Nadie dijo nada todavía. Empezá vos.</Text>}
      {msgs.map((m) => {
        const own = m.userId === me;
        return (
          <View key={m.id} style={[styles.bubble, own && styles.bubbleOwn]}>
            {!own && <Text style={styles.author}>{displayName(m.userId)}</Text>}
            <Text style={[styles.body, own && { color: '#fff' }]}>{m.body}</Text>
          </View>
        );
      })}

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Escribir en la poll"
          placeholderTextColor={colors.muted}
          style={styles.input}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable onPress={send} style={styles.send} accessibilityRole="button">
          <Text style={styles.sendText}>Enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { ...t.body, fontSize: 13, color: colors.muted },
  bubble: {
    backgroundColor: colors.surfaceAlt,
    padding: space.md,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    maxWidth: '85%',
    gap: 2,
  },
  bubbleOwn: { backgroundColor: colors.ink, alignSelf: 'flex-end' },
  author: { ...t.label, color: colors.muted },
  body: { ...t.body, color: colors.ink, lineHeight: 20 },
  composer: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: {
    flex: 1,
    ...t.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
  },
  send: {
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

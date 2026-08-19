import { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, space, type as t } from '../../../theme';
import { Button, Card, Label } from '../../../components/ui';
import { useStore } from '../../../lib/mock/store';
import { displayName } from '../../../lib/mock/data';

const CLOSE_OPTIONS = [
  { label: '3 horas', hours: 3 },
  { label: '12 horas', hours: 12 },
  { label: '1 día', hours: 24 },
  { label: '3 días', hours: 72 },
  { label: '1 semana', hours: 168 },
];

export default function CreatePoll() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { membersOf, dispatch, me } = useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [closeIn, setCloseIn] = useState(24);
  const [resolveIn, setResolveIn] = useState(72);
  const [subjects, setSubjects] = useState<string[]>([]);

  const others = membersOf(groupId).filter((m) => m.userId !== me);
  const valid = title.trim().length > 3 && resolveIn >= closeIn;

  function toggle(userId: string) {
    setSubjects((s) => (s.includes(userId) ? s.filter((x) => x !== userId) : [...s, userId]));
  }

  function submit() {
    const now = Date.now();
    dispatch({
      type: 'CREATE_POLL',
      poll: {
        id: `p_${Math.random().toString(36).slice(2, 8)}`,
        groupId,
        creatorId: me,
        title: title.trim(),
        description: description.trim() || undefined,
        status: 'PENDING_APPROVAL',
        bettingClosesAt: new Date(now + closeIn * 3600_000).toISOString(),
        outcomeDeadline: new Date(now + resolveIn * 3600_000).toISOString(),
        createdAt: new Date().toISOString(),
        subjectIds: subjects,
      },
    });
    setTitle('');
    setDescription('');
    setSubjects([]);
    router.push(`/group/${groupId}`);
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: space.md }}>
        <Label>La predicción</Label>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ej: El Pelado se saca 10 en el escrito"
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
        />
        <Label>Cómo se decide (opcional)</Label>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Qué cuenta como SÍ y qué cuenta como NO"
          placeholderTextColor={colors.muted}
          style={[styles.input, { minHeight: 70 }]}
          multiline
        />
      </Card>

      <Card style={{ gap: space.md }}>
        <Label>Involucrados</Label>
        <Text style={styles.hint}>
          Quién aparece en la predicción. El árbitro lo usa para ver si alguien puede
          decidir el resultado a propósito.
        </Text>
        <View style={styles.chips}>
          {others.map((m) => {
            const on = subjects.includes(m.userId);
            return (
              <Pressable
                key={m.userId}
                onPress={() => toggle(m.userId)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && { color: '#fff' }]}>
                  {displayName(m.userId)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: space.md }}>
        <Label>Las apuestas cierran en</Label>
        <Options value={closeIn} onChange={setCloseIn} />
        <Label>El resultado se sabe antes de</Label>
        <Options value={resolveIn} onChange={setResolveIn} />
        {resolveIn < closeIn && (
          <Text style={styles.error}>
            El resultado no puede vencer antes de que cierren las apuestas.
          </Text>
        )}
      </Card>

      <Text style={styles.hint}>
        Al enviarla queda esperando la aprobación del árbitro. Hasta entonces nadie puede apostar.
      </Text>
      <Button title="Enviar al árbitro" onPress={submit} disabled={!valid} />
    </ScrollView>
  );
}

function Options({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  return (
    <View style={styles.chips}>
      {CLOSE_OPTIONS.map((o) => {
        const on = o.hours === value;
        return (
          <Pressable
            key={o.label}
            onPress={() => onChange(o.hours)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && { color: '#fff' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  input: {
    ...t.body,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  hint: { ...t.body, fontSize: 12, color: colors.muted, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
  },
  chipOn: { backgroundColor: colors.ink },
  chipText: { ...t.body, fontSize: 13, color: colors.ink, fontWeight: '600' },
  error: { ...t.body, fontSize: 13, color: colors.danger },
});

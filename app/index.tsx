import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, type as t } from '../theme';
import { Button, Card, Empty, Label } from '../components/ui';
import { useStore } from '../lib/mock/store';
import { points } from '../lib/format';

export default function Groups() {
  const router = useRouter();
  const { groupsOf, balance, membersOf, dispatch } = useStore();
  const [code, setCode] = useState('');
  const [newName, setNewName] = useState('');
  const groups = groupsOf();

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>Tus grupos</Text>

      {groups.length === 0 && (
        <Empty title="Todavía no estás en ningún grupo" hint="Creá uno o entrá con un código." />
      )}

      {groups.map((g) => (
        <Pressable key={g.id} onPress={() => router.push(`/group/${g.id}`)}>
          <Card style={{ gap: 6 }}>
            <Text style={styles.groupName}>{g.name}</Text>
            <Text style={styles.groupMeta}>
              {membersOf(g.id).length} integrantes · código {g.inviteCode}
            </Text>
            <Text style={styles.balance}>{points(balance(g.id))} pts</Text>
          </Card>
        </Pressable>
      ))}

      <Card style={{ gap: space.md, marginTop: space.lg }}>
        <Label>Entrar a un grupo</Label>
        <TextInput
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          placeholder="Código de invitación"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Button
          title="Entrar"
          disabled={!code.trim()}
          onPress={() => {
            dispatch({ type: 'JOIN_GROUP', inviteCode: code });
            setCode('');
          }}
        />
      </Card>

      <Card style={{ gap: space.md }}>
        <Label>Crear un grupo</Label>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Nombre del grupo"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Button
          title="Crear grupo"
          disabled={!newName.trim()}
          onPress={() => {
            dispatch({ type: 'CREATE_GROUP', name: newName.trim() });
            setNewName('');
          }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  h1: { ...t.display, color: colors.ink },
  groupName: { ...t.title, color: colors.ink },
  groupMeta: { ...t.body, fontSize: 13, color: colors.muted },
  balance: { ...t.points, color: colors.ink, marginTop: 4 },
  input: {
    ...t.body,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
});

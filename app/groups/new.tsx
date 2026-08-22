/**
 * Crear grupo vive en su propia pantalla, no en un panel dentro de "Tus grupos":
 * el listado se mantiene como listado y el alta tiene su propio header y su
 * propio estado, que se descarta solo al salir.
 *
 * El alta es una sola llamada a la RPC `create_group` (§4): la base crea el
 * grupo, mete al creador como owner y genera el invite_code. El cliente no
 * inserta en `groups` ni decide quién es dueño de qué (§9).
 */
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, radius, space, type as t } from '../../theme';
import { Button } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ChatBubbleIcon, UserGroupIcon } from '../../components/icons';
import { useGroups } from '../../lib/groups';

const NAME_MAX = 30;
const DESCRIPTION_MAX = 120;

export default function NewGroup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createGroup } = useGroups();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = name.trim().length > 0;

  // Vuelve a "Tus grupos" con la lista ya refrescada: el grupo nuevo se ve
  // apenas aparece la pantalla, sin un segundo de lista vieja.
  async function submit() {
    if (busy || !valid) return; // corta el doble submit antes de llamar a la RPC
    setBusy(true);
    setError(null);
    try {
      await createGroup({ name, description });
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos crear el grupo.');
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader onBack={() => router.back()} backDisabled={busy} />

      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.h1}>Crear grupo</Text>
        <Text style={styles.lead}>Crea un grupo para hacer predicciones con tus amigos.</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Nombre del grupo</Text>
          <View style={styles.input}>
            <UserGroupIcon color={colors.ink} />
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                setError(null);
              }}
              autoFocus
              editable={!busy}
              maxLength={NAME_MAX}
              returnKeyType="done"
              placeholder="Ej: Los pibes"
              placeholderTextColor={colors.faint}
              style={styles.inputText}
            />
          </View>
          <Text style={styles.counter}>
            {name.length}/{NAME_MAX}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
          <View style={[styles.input, styles.inputMultiline]}>
            <ChatBubbleIcon color={colors.ink} />
            <TextInput
              value={description}
              onChangeText={(v) => {
                setDescription(v);
                setError(null);
              }}
              multiline
              editable={!busy}
              maxLength={DESCRIPTION_MAX}
              placeholder="¿De qué va tu grupo?"
              placeholderTextColor={colors.faint}
              style={[styles.inputText, styles.inputTextMultiline]}
            />
          </View>
          <Text style={styles.counter}>
            {description.length}/{DESCRIPTION_MAX}
          </Text>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Button
          title={busy ? 'Creando…' : 'Crear grupo'}
          disabled={!valid || busy}
          onPress={submit}
          style={styles.submit}
        />
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.cancel, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.lg, gap: space.lg },
  h1: { ...t.display, color: colors.ink, marginTop: space.md },
  lead: { ...t.body, color: colors.muted, lineHeight: 22, marginBottom: space.sm },
  field: { gap: space.sm },
  fieldLabel: { ...t.body, fontWeight: '700', color: colors.ink },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space.lg,
    minHeight: 56,
  },
  inputMultiline: { alignItems: 'flex-start', paddingVertical: space.lg, minHeight: 116 },
  inputText: { ...t.body, flex: 1, color: colors.ink, paddingVertical: space.md },
  inputTextMultiline: { paddingVertical: 0, minHeight: 76, textAlignVertical: 'top' },
  counter: { ...t.small, color: colors.faint, alignSelf: 'flex-end' },
  error: { ...t.small, color: colors.danger },
  submit: { marginTop: space.md },
  cancel: { alignSelf: 'center', paddingVertical: space.md, paddingHorizontal: space.lg },
  cancelText: { ...t.small, fontWeight: '600', color: colors.muted },
});

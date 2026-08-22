/**
 * Unirse con código: misma decisión que crear grupo (§ pantalla propia, no panel
 * inline), para que "Tus grupos" quede sólo como listado.
 *
 * La membresía la crea la RPC `join_group_by_code` (§5), nunca un insert desde
 * el cliente: el rol y el user_id los pone la base con auth.uid() (§9).
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
import { QrCodeIcon } from '../../components/icons';
import { useGroups } from '../../lib/groups';

export default function JoinGroup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { joinGroupByCode } = useGroups();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy || !code.trim()) return; // corta el doble submit
    setBusy(true);
    setError(null);
    try {
      await joinGroupByCode(code);
      // Volvemos al listado ya refrescado, con el grupo nuevo adentro.
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No encontramos ningún grupo con ese código.',
      );
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
        <Text style={styles.h1}>Unirme con código</Text>
        <Text style={styles.lead}>Pedile el código de invitación a alguien del grupo.</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Código de invitación</Text>
          <View style={styles.input}>
            <QrCodeIcon color={colors.ink} />
            <TextInput
              value={code}
              onChangeText={(v) => {
                setCode(v);
                setError(null);
              }}
              autoFocus
              editable={!busy}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={submit}
              placeholder="Ej: A1B2C3"
              placeholderTextColor={colors.faint}
              style={styles.inputText}
            />
          </View>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>

        <Button
          title={busy ? 'Entrando…' : 'Unirme'}
          disabled={!code.trim() || busy}
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
  inputText: { ...t.body, flex: 1, color: colors.ink, paddingVertical: space.md, letterSpacing: 1 },
  error: { ...t.small, color: colors.danger },
  submit: { marginTop: space.md },
  cancel: { alignSelf: 'center', paddingVertical: space.md, paddingHorizontal: space.lg },
  cancelText: { ...t.small, fontWeight: '600', color: colors.muted },
});

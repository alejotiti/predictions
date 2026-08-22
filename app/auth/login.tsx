/**
 * Entrar (§2). Mismo lenguaje visual que las pantallas de alta de grupo:
 * header propio, título display, campos con ícono y botón sólido.
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
import { EnvelopeIcon, LockIcon } from '../../components/icons';
import { useAuth } from '../../lib/auth';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = email.trim().length > 0 && password.length > 0;

  async function submit() {
    if (busy || !valid) return; // corta el doble submit antes de tocar la red
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      // No navegamos: al haber sesión, el layout raíz deja de mostrar auth.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos entrar.');
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.h1}>Entrar</Text>
        <Text style={styles.lead}>Predicciones entre amigos, con puntos que no valen nada.</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={styles.input}>
            <EnvelopeIcon color={colors.ink} />
            <TextInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
              placeholder="vos@ejemplo.com"
              placeholderTextColor={colors.faint}
              style={styles.inputText}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Contraseña</Text>
          <View style={styles.input}>
            <LockIcon color={colors.ink} />
            <TextInput
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={submit}
              placeholder="••••••••"
              placeholderTextColor={colors.faint}
              style={styles.inputText}
            />
          </View>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>

        <Button
          title={busy ? 'Entrando…' : 'Entrar'}
          disabled={!valid || busy}
          onPress={submit}
          style={styles.submit}
        />
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.push('/auth/register')}
          style={({ pressed }) => [styles.link, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Text style={styles.linkText}>
            ¿No tenés cuenta? <Text style={styles.linkStrong}>Creá una</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.lg, gap: space.lg },
  h1: { ...t.display, color: colors.ink },
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
  inputText: { ...t.body, flex: 1, color: colors.ink, paddingVertical: space.md },
  error: { ...t.small, color: colors.danger },
  submit: { marginTop: space.md },
  link: { alignSelf: 'center', paddingVertical: space.md, paddingHorizontal: space.lg },
  linkText: { ...t.small, color: colors.muted },
  linkStrong: { fontWeight: '700', color: colors.ink },
});

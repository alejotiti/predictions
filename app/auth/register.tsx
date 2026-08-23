/**
 * Crear cuenta (§2). El `username` viaja en options.data porque la base crea
 * sola la fila de `profiles` con ese metadato: el cliente no la inserta (§9).
 *
 * El proyecto pide confirmar el mail, así que después de registrarse todavía no
 * hay sesión: en vez de dejar al usuario mirando un formulario que "no hizo
 * nada", la pantalla pasa a un estado de "revisá tu correo".
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
import { ChevronLeftIcon, EnvelopeIcon, LockIcon, UserIcon } from '../../components/icons';
import { useAuth } from '../../lib/auth';

const USERNAME_MAX = 20;

/**
 * El usuario admite letras sin tildes, números, guiones y guiones bajos:
 * filtramos al tipear (y al pegar) en vez de retar después.
 */
function cleanUsername(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}

export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const valid = username.trim().length >= 3 && email.trim().length > 0 && password.length >= 6;

  async function submit() {
    if (busy || !valid) return; // corta el doble submit
    setBusy(true);
    setError(null);
    try {
      const { needsEmailConfirmation } = await signUp(email, password, username);
      // Si el proyecto no exigiera confirmar, ya hay sesión y el layout raíz
      // manda solo a la app; no hace falta navegar acá.
      if (needsEmailConfirmation) setSentTo(email.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos crear la cuenta.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.5 : 1 }]}
        >
          <ChevronLeftIcon color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {sentTo ? (
          <>
            <Text style={styles.h1}>Revisá tu correo</Text>
            <Text style={styles.lead}>
              Te mandamos un mail a {sentTo} para confirmar la cuenta. Tocá el link y después entrá
              con tu email y contraseña.
            </Text>
            <Button
              title="Ir a entrar"
              onPress={() => router.replace('/auth/login')}
              style={styles.submit}
            />
          </>
        ) : (
          <>
            <Text style={styles.h1}>Crear cuenta</Text>
            <Text style={styles.lead}>Elegí cómo te van a ver tus amigos en los grupos.</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Usuario</Text>
              <View style={styles.input}>
                <UserIcon color={colors.ink} />
                <TextInput
                  value={username}
                  onChangeText={(v) => {
                    setUsername(cleanUsername(v));
                    setError(null);
                  }}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  maxLength={USERNAME_MAX}
                  returnKeyType="next"
                  placeholder="No uses tu nombre real"
                  placeholderTextColor={colors.faint}
                  style={styles.inputText}
                />
              </View>
            </View>

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
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={submit}
                  placeholder="Al menos 6 caracteres"
                  placeholderTextColor={colors.faint}
                  style={styles.inputText}
                />
              </View>
              {!!error && <Text style={styles.error}>{error}</Text>}
            </View>

            <Button
              title={busy ? 'Creando…' : 'Crear cuenta'}
              disabled={!valid || busy}
              onPress={submit}
              style={styles.submit}
            />
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => router.replace('/auth/login')}
              style={({ pressed }) => [styles.link, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Text style={styles.linkText}>
                ¿Ya tenés cuenta? <Text style={styles.linkStrong}>Entrá</Text>
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  back: { width: 36, height: 36, justifyContent: 'center' },
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
  inputText: { ...t.body, flex: 1, color: colors.ink, paddingVertical: space.md },
  error: { ...t.small, color: colors.danger },
  submit: { marginTop: space.md },
  link: { alignSelf: 'center', paddingVertical: space.md, paddingHorizontal: space.lg },
  linkText: { ...t.small, color: colors.muted },
  linkStrong: { fontWeight: '700', color: colors.ink },
});

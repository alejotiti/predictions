import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space, type as t } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  tone = 'ink',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  tone?: 'ink' | 'yes' | 'no' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    tone === 'yes' ? colors.yes : tone === 'no' ? colors.no : tone === 'ghost' ? 'transparent' : colors.ink;
  const fg = tone === 'ghost' ? colors.ink : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.35 : pressed ? 0.85 : 1 },
        tone === 'ghost' && styles.buttonGhost,
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Pill({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'yes' | 'no' | 'warn' }) {
  const map = {
    neutral: { bg: colors.surfaceAlt, fg: colors.muted },
    yes: { bg: colors.yesSoft, fg: colors.yes },
    no: { bg: colors.noSoft, fg: colors.no },
    warn: { bg: '#FFF3D6', fg: '#8A6100' },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      <Text style={[styles.pillText, { color: map.fg }]}>{text}</Text>
    </View>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint && <Text style={styles.emptyHint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: { ...t.label, color: colors.muted, textTransform: 'uppercase' },
  button: {
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  buttonGhost: { borderWidth: 1, borderColor: colors.line },
  buttonText: { fontSize: 15, fontWeight: '700' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  empty: { padding: space.xl, alignItems: 'center', gap: 6 },
  emptyTitle: { ...t.body, fontWeight: '600', color: colors.ink },
  emptyHint: { ...t.body, fontSize: 13, color: colors.muted, textAlign: 'center' },
});

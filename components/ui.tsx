import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, control, radius, shadow, space, type as t } from '../theme';

/**
 * La tarjeta se separa del papel con sombra y no con borde (DESIGN.md): sobre
 * un fondo gris, un contorno gris no separa nada y le compite a la barra del
 * pozo, que es lo único que tiene que llamar la atención adentro.
 */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** El punto verde de "esto está abierto". No es un lado ni un semáforo. */
export function LiveDot({ color = colors.live, size = 7 }: { color?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

/**
 * Comentarios que todavía no viste, arriba a la derecha de la tarjeta.
 *
 * Va en `colors.accent` y no en `colors.yes`: azul, pero no el azul del SÍ, así
 * que un punto suelto en una esquina no se lee como un lado (DESIGN.md). Es un
 * poco más grande que el punto de `live` para que no parezca el mismo dato
 * mirado de reojo.
 *
 * Punto pelado, sin el número adentro: lo único que hay que decidir mirándolo
 * es si entrar o no, y para eso alcanza con que haya algo. La cuenta va en la
 * etiqueta de accesibilidad, donde sí suma.
 */
export function UnreadDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View
      accessibilityLabel={
        count === 1 ? '1 comentario sin leer' : `${count} comentarios sin leer`
      }
      style={styles.unreadDot}
    />
  );
}

export function Button({
  title,
  onPress,
  tone = 'ink',
  disabled,
  style,
  icon,
}: {
  title: string;
  onPress: () => void;
  tone?: 'ink' | 'yes' | 'no' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Recibe el color del texto para que el ícono siga el tono del botón. */
  icon?: (color: string) => React.ReactNode;
}) {
  const bg =
    tone === 'yes' ? colors.yes : tone === 'no' ? colors.no : tone === 'ghost' ? 'transparent' : colors.ink;
  const fg = tone === 'ghost' ? colors.ink : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        // Deshabilitado es opacidad, no otro color: el botón se destiñe y se
        // lee "existe pero no ahora", que es justo lo que pasa con el lado
        // bloqueado cuando ya apostaste del otro.
        { backgroundColor: bg, opacity: disabled ? 0.35 : pressed ? 0.85 : 1 },
        tone === 'ghost' && styles.buttonGhost,
        style,
      ]}
    >
      <View style={styles.buttonContent}>
        {icon?.(fg)}
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

export function Pill({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'yes' | 'no' | 'warn' }) {
  const map = {
    neutral: { bg: colors.surfaceAlt, fg: colors.muted },
    yes: { bg: colors.yesSoft, fg: colors.yes },
    no: { bg: colors.noSoft, fg: colors.no },
    warn: { bg: colors.warnSoft, fg: colors.warn },
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
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.card,
  },
  label: { ...t.label, color: colors.faint },
  // El `marginTop` lo centra contra el primer renglón del título (9 de punto
  // dentro de los 24 de `lineHeight`), que es donde tiene que quedar cuando el
  // título ocupa dos líneas.
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    marginTop: (t.title.lineHeight - 9) / 2,
  },
  button: {
    minHeight: control.height,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGhost: { borderWidth: 1, borderColor: colors.line },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  buttonText: { fontSize: 15, fontWeight: '700' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  empty: { padding: space.xl, alignItems: 'center', gap: 6 },
  emptyTitle: { ...t.body, fontWeight: '600', color: colors.ink },
  emptyHint: { ...t.small, color: colors.muted, textAlign: 'center' },
});

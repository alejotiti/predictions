import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Bars3Icon } from './icons';
import { colors, space } from '../theme';

/**
 * La salida del grupo, arriba a la izquierda de las tres pestañas. Es el
 * espejo de `HeaderBalance`: mismo lugar del otro lado y el mismo margen, así
 * que la fila del header queda pareja.
 *
 * Vuelve a "Tus grupos" en vez de apilarlo encima: la lista ya está abajo en
 * el stack, y empujar una copia dejaría el mismo grupo dos veces en el camino
 * de vuelta.
 */
export function HeaderGroups() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ir a tus grupos"
      hitSlop={12}
      onPress={() => (router.canGoBack() ? router.dismissTo('/') : router.replace('/'))}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.5 : 1 }]}
    >
      <Bars3Icon color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // El margen lo trae el botón y no el header, igual que la burbuja del saldo:
  // el contenedor izquierdo del header de las pestañas no pone ninguno.
  button: { paddingLeft: space.lg, paddingRight: space.sm, paddingVertical: space.xs },
});

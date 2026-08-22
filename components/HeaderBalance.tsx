import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, space, type as t } from '../theme';
import { Bone } from './Skeleton';
import { points } from '../lib/format';

/**
 * Tu saldo, siempre arriba a la derecha del header y siempre igual (DESIGN.md).
 * No es un dato de la pantalla que estés mirando sino de la sesión, así que no
 * entra a la hoja ni a una tarjeta: si cambiara de lugar según dónde estás,
 * habría que buscarlo cada vez.
 *
 * Va adentro de una burbuja blanca y no suelto sobre el papel: un número solo
 * en una esquina se lee como parte del título de la pantalla. La burbuja lo
 * separa y lo convierte en una cosa propia, la misma en todas las pantallas.
 *
 * Cada pantalla trae su propio número, el que acaba de leer del ledger. Lo que
 * se comparte es el lugar y la forma, no el dato.
 */
export function HeaderBalance({ balance, loading }: { balance: number; loading?: boolean }) {
  return (
    <View style={styles.bubble}>
      {/* Mientras carga no mostramos 0: un cero se lee como un saldo real. El
          hueso mide lo que mediría un saldo de cuatro cifras, así que la
          burbuja no cambia de ancho cuando llega el número. */}
      {loading ? (
        <Bone width={54} height={13} />
      ) : (
        <Text style={styles.text}>{points(balance)} pts</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    // El margen lo trae la burbuja y no el header: el contenedor derecho del
    // header de las pestañas no pone ninguno, así que sin esto quedaba pegada
    // al borde de la pantalla en "Inicio" y no en la otra.
    marginRight: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 32,
  },
  text: { ...t.num, fontSize: 14, color: colors.ink },
});

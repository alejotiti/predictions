import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeftIcon } from './icons';
import { colors, space, type as t } from '../theme';

/**
 * Header propio, dibujado en JS.
 *
 * Existe por una razón concreta: desde iOS 26 el header *nativo* mete lo que le
 * pongas a los costados adentro de una cápsula de vidrio suya, y el header de
 * las pestañas —que es de JS— no hace nada de eso. Con la misma burbuja del
 * saldo en las dos pantallas, una terminaba con dos bordes y la otra con uno.
 * `react-native-screens` 4.16 no expone forma de apagar esa cápsula
 * (`hidesSharedBackground` existe en la API de native-stack pero screens
 * todavía no lo implementa), así que la salida es no pasar por el header
 * nativo: acá lo dibujamos nosotros y la única burbuja es la nuestra.
 *
 * Las medidas son las mismas que las del header de las pestañas para que el
 * contenido caiga exactamente a la misma altura al cambiar de pantalla.
 */
const CONTENT_HEIGHT = Platform.OS === 'ios' ? 44 : 56;

export function ScreenHeader({
  onBack,
  backDisabled,
  left,
  title,
  right,
}: {
  onBack?: () => void;
  backDisabled?: boolean;
  /** Reemplaza a la flecha de volver: adentro del grupo va el botón de grupos. */
  left?: React.ReactNode;
  /** El título va centrado, y se recorta antes de empujar a los costados. */
  title?: string;
  /** Lo que va a la derecha. Trae su propio margen, igual que en las pestañas. */
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top, height: insets.top + CONTENT_HEIGHT }]}>
      <View style={styles.start}>
        {left}
        {!left && onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={12}
            disabled={backDisabled}
            onPress={onBack}
            style={({ pressed }) => [styles.back, { opacity: pressed ? 0.5 : 1 }]}
          >
            <ChevronLeftIcon color={colors.ink} />
          </Pressable>
        )}
      </View>
      {!!title && (
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      )}
      <View style={styles.end}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper },
  // Los dos costados miden igual y crecen igual, como en el header de las
  // pestañas: uno empuja a la izquierda y el otro a la derecha, sin cuentas.
  // Con `flex: 1` la base de los dos es cero, así que se reparten lo que sobra
  // en partes iguales y el título queda centrado sin medir a nadie.
  start: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  end: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  // El que cede es el título, no el saldo ni el botón: en un grupo de nombre
  // largo se corta con puntos suspensivos y los costados quedan enteros.
  title: { ...t.title, color: colors.ink, flexShrink: 1 },
  back: { paddingLeft: space.md, paddingRight: space.sm, paddingVertical: space.xs },
});

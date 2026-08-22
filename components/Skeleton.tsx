import { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet, type DimensionValue } from 'react-native';
import { colors, control, radius, space } from '../theme';
import { Card } from './ui';

/**
 * Huesos de carga: mientras la base todavía no contestó mostramos la forma de
 * lo que viene, no un spinner ni un estado vacío. La lista no salta cuando
 * llegan los datos y se entiende qué se está esperando (§7).
 *
 * El latido es uno solo para toda la app, en un `Animated.Value` de módulo: así
 * todos los huesos laten en fase —varios relojes desfasados se leen como ruido—
 * y hay una sola animación corriendo por más huesos que haya en pantalla.
 */
const pulse = new Animated.Value(0);
let mounted = 0;
let loop: Animated.CompositeAnimation | null = null;

function beat(toValue: number) {
  return Animated.timing(pulse, {
    toValue,
    duration: 750,
    easing: Easing.inOut(Easing.quad),
    // Sólo opacidad: va entero al hilo nativo y no cuesta un render por frame.
    useNativeDriver: true,
  });
}

function useHeartbeat() {
  useEffect(() => {
    if (mounted++ === 0) {
      loop = Animated.loop(Animated.sequence([beat(1), beat(0)]));
      loop.start();
    }
    return () => {
      if (--mounted === 0) {
        loop?.stop();
        loop = null;
        pulse.setValue(0);
      }
    };
  }, []);
}

/** Un rectángulo que late. Ancho en porcentaje para que siga a su contenedor. */
export function Bone({
  width = '100%',
  height = 12,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  style?: Animated.WithAnimatedValue<object>;
}) {
  useHeartbeat();
  const opacity = useRef(pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] })).current;
  return (
    <Animated.View
      // Un hueso no es contenido: el lector de pantalla lo salta y escucha el
      // estado de carga de la pantalla, no una lista de cajas vacías.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.bone,
        { width, height, borderRadius: height >= 24 ? radius.xs : height / 2, opacity },
        style,
      ]}
    />
  );
}

/** Una tarjeta de grupo: nombre y saldo arriba, descripción y metadatos abajo. */
export function GroupCardSkeleton() {
  return (
    <Card style={{ gap: space.sm }}>
      <View style={styles.row}>
        <Bone width="52%" height={18} />
        <Bone width={64} height={14} />
      </View>
      <Bone width="80%" />
      <Bone width="40%" />
    </Card>
  );
}

/** Una tarjeta del feed, con la anatomía de una predicción (DESIGN.md). */
export function PollCardSkeleton() {
  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: 4 }}>
        <Bone width="85%" height={19} />
        <Bone width="34%" height={12} />
      </View>
      <View style={styles.row}>
        <Bone width={62} height={14} />
        <Bone width={78} height={17} />
      </View>
      <Bone width="100%" height={34} style={{ borderRadius: radius.sm }} />
      <Bone width="30%" height={11} />
    </Card>
  );
}

/** Una fila del ranking: puesto, nombre y puntos, con las mismas medidas. */
export function RankingRowSkeleton() {
  return (
    <Card style={styles.rankingRow}>
      <Bone width={14} height={13} />
      <View style={{ flex: 1 }}>
        <Bone width="45%" height={15} />
      </View>
      <Bone width={52} height={16} />
    </Card>
  );
}

/** El detalle de una poll: título, fecha, tarjeta con la barra y los botones. */
export function PollDetailSkeleton() {
  return (
    <View style={styles.page}>
      <Bone width="90%" height={26} />
      <Bone width="55%" height={26} />
      <Bone width="34%" height={13} />
      <Card style={{ gap: space.md }}>
        <View style={styles.row}>
          <Bone width={64} height={14} />
          <Bone width={110} height={26} />
        </View>
        <Bone width="100%" height={44} style={{ borderRadius: radius.sm }} />
        <View style={styles.actions}>
          <Bone width="48%" height={control.height} style={{ borderRadius: radius.sm }} />
          <Bone width="48%" height={control.height} style={{ borderRadius: radius.sm }} />
        </View>
      </Card>
      <Bone width="35%" height={12} />
      <View style={{ gap: space.md, marginTop: space.md }}>
        <Bone width="60%" height={38} style={{ borderRadius: radius.lg }} />
        <Bone width="45%" height={38} style={{ borderRadius: radius.lg, alignSelf: 'flex-end' }} />
      </View>
    </View>
  );
}

/** Una tarjeta del panel de árbitro: título, contexto y su par de acciones. */
export function AdminCardSkeleton() {
  return (
    <Card style={{ gap: space.md }}>
      <Bone width="75%" height={17} />
      <Bone width="90%" height={13} />
      <Bone width="50%" height={12} />
      <View style={styles.actions}>
        <Bone width="48%" height={control.height} style={{ borderRadius: radius.sm }} />
        <Bone width="48%" height={control.height} style={{ borderRadius: radius.sm }} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  bone: { backgroundColor: colors.surfaceAlt },
  page: { padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  rankingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
});

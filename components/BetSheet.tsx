import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space, type as t } from '../theme';
import { Button, Label } from './ui';
import { estimatedMultiplier, estimatedPayout, type Pool, type Side } from '../lib/domain/market';
import { points } from '../lib/format';

const QUICK = [50, 100, 250, 500];

export function BetSheet({
  visible,
  side,
  pool,
  balance,
  currentStake = 0,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  side: Side;
  pool: Pool;
  balance: number;
  currentStake?: number;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const [raw, setRaw] = useState('');
  const amount = Number.parseInt(raw || '0', 10) || 0;
  const overBalance = amount > balance;
  const valid = amount > 0 && !overBalance;

  const payout = estimatedPayout(pool, side, amount, currentStake);
  const mult = estimatedMultiplier(pool, side, amount, currentStake);
  const tone = side === 'YES' ? colors.yes : colors.no;

  /*
    El `animationType="slide"` del Modal desliza todo lo que hay adentro, y el
    oscurecido es parte de eso: entraba subiendo pegado a la hoja, como si
    fuera su papel y no el fondo. Acá el Modal no anima nada y movemos las dos
    capas por separado: el fondo se funde en el lugar y sólo la hoja sube.
  */
  /** 0 cerrada, 1 abierta. Es la animación de entrada y salida. */
  const progress = useSharedValue(0);
  /** Cuánto la corrió el dedo. Se suma a donde la tenga `progress`. */
  const dragY = useSharedValue(0);
  /** Alto medido. Hasta que mida, la hoja se esconde una pantalla abajo. */
  const sheetH = useSharedValue(0);
  // Sigue montada mientras se va: si no, al cerrar desaparecería de golpe.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      dragY.value = 0;
      progress.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    } else {
      progress.value = withTiming(
        0,
        { duration: 190, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }
      );
    }
  }, [dragY, mounted, progress, visible]);

  function close() {
    Keyboard.dismiss();
    setRaw('');
    onClose();
  }

  /*
    Se arrastra agarrando de arriba del campo. Va con react-native-gesture-handler
    —el mismo gesto que el de salir de un grupo— pero con su propio
    `GestureHandlerRootView` adentro del Modal: el Modal monta en otra jerarquía
    nativa y la raíz de `app/_layout.tsx` no llega hasta acá.
  */
  const grab = Gesture.Pan()
    // Sólo cuenta cuando baja: para arriba la hoja no tiene a dónde ir.
    .activeOffsetY(8)
    .onUpdate((e) => {
      'worklet';
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      'worklet';
      const h = sheetH.value || screenH;
      // Un tirón corto pero rápido también cierra: si sólo valiera la
      // distancia, habría que arrastrar media hoja para que pase algo.
      if (dragY.value > h * 0.25 || e.velocityY > 700) {
        dragY.value = withTiming(
          h,
          { duration: 170, easing: Easing.in(Easing.cubic) },
          (finished) => {
            if (!finished) return;
            // Ya salió de pantalla: dejamos las dos capas como si estuvieran
            // cerradas antes de avisar, así la animación de salida no la
            // muestra de nuevo para volver a esconderla.
            progress.value = 0;
            dragY.value = 0;
            runOnJS(close)();
          }
        );
      } else {
        dragY.value = withSpring(0, { damping: 22, stiffness: 260, mass: 0.6 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => {
    const h = sheetH.value || screenH;
    return { transform: [{ translateY: (1 - progress.value) * h + dragY.value }] };
  });

  const scrimStyle = useAnimatedStyle(() => {
    const h = sheetH.value || screenH;
    // Se aclara a medida que la hoja baja: el fondo acompaña al dedo y se ve
    // que soltar ahí cierra, sin tener que soltar para averiguarlo.
    const dragged = Math.min(1, Math.max(0, dragY.value / h));
    return { opacity: progress.value * (1 - dragged) };
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      // Sin esto el oscurecido se corta en la barra de estado en Android y se
      // ve que es una capa de la hoja y no el fondo de la pantalla.
      statusBarTranslucent
      onRequestClose={close}
    >
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}
        />
        {/*
          El teclado numérico no trae tecla de "listo", así que si tapa el botón no
          hay forma de apostar. La hoja sube por encima del teclado y lo que no
          entra se scrollea: el botón siempre queda a mano, sin bajar el teclado.
        */}
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          // El inset de abajo ya lo pone la hoja: descontarlo acá evita que quede
          // el hueco del home indicator entre la hoja y el teclado.
          keyboardVerticalOffset={-insets.bottom}
        >
          <Pressable style={styles.dismissArea} onPress={close} />
          <Animated.View
            onLayout={(e) => {
              sheetH.value = e.nativeEvent.layout.height;
            }}
            style={[styles.sheet, { paddingBottom: space.lg + insets.bottom }, sheetStyle]}
          >
            {/* La zona de agarre es todo lo que hay arriba del campo, título
                incluido: es la única parte de la hoja que no scrollea, así que
                es la única donde arrastrar no compite con leer. */}
            <GestureDetector gesture={grab}>
              <View style={styles.grabZone}>
                <View style={styles.grabber} />
                <Text style={[styles.heading, { color: tone }]}>
                  Apostar a {side === 'YES' ? 'SÍ' : 'NO'}
                </Text>
              </View>
            </GestureDetector>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              // El título ya no scrollea, así que el que tiene que achicarse
              // contra el `maxHeight` de la hoja es esto y no el conjunto.
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              <Label>Puntos</Label>
              <TextInput
                value={raw}
                onChangeText={(v) => setRaw(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.faint}
                style={[styles.input, overBalance && { borderColor: colors.danger }]}
                autoFocus
              />

              <View style={styles.quick}>
                {QUICK.map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => setRaw(String(q))}
                    disabled={q > balance}
                    style={({ pressed }) => [
                      styles.chip,
                      q > balance && { opacity: 0.3 },
                      // El chip es chico y no lleva transform: a este tamaño un
                      // 0,97 no se ve. Lo que responde es el fondo, que se
                      // oscurece un punto mientras el dedo está apoyado.
                      pressed && q <= balance && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.chipText}>{q}</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setRaw(String(balance))}
                  disabled={balance <= 0}
                  style={({ pressed }) => [
                    styles.chip,
                    balance <= 0 && { opacity: 0.3 },
                    pressed && balance > 0 && styles.chipPressed,
                  ]}
                >
                  <Text style={styles.chipText}>todo</Text>
                </Pressable>
              </View>

              <View style={styles.rows}>
                <Row label="Tu saldo" value={`${points(balance)} pts`} />
                {currentStake > 0 && (
                  <Row label="Ya tenías puesto" value={`${points(currentStake)} pts`} />
                )}
                <Row
                  label="Si ganás, cobrás"
                  value={amount > 0 ? `${points(payout)} pts` : '—'}
                  strong
                />
                <Row
                  label="Multiplicador estimado"
                  value={amount > 0 ? `${mult.toFixed(2)}×` : '—'}
                />
              </View>

              {overBalance && (
                <Text style={styles.error}>
                  No te alcanza el saldo. Tenés {points(balance)} pts.
                </Text>
              )}
              <Text style={styles.note}>
                El retorno cambia hasta el cierre, según cuánto entre de cada lado.
                Una vez que apostás no podés cambiar de lado ni retirar.
              </Text>

              <Button
                title={
                  valid ? `Apostar ${points(amount)} a ${side === 'YES' ? 'SÍ' : 'NO'}` : 'Apostar'
                }
                tone={side === 'YES' ? 'yes' : 'no'}
                disabled={!valid}
                onPress={() => {
                  onConfirm(amount);
                  setRaw('');
                }}
              />
              <Button title="Cancelar" tone="ghost" onPress={close} />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: colors.scrim },
  /** Lo que queda arriba de la hoja: no pinta nada, sólo cierra al tocarlo. */
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    // Con el teclado arriba la hoja no puede ocupar toda la pantalla: se corta
    // acá y adentro scrollea.
    maxHeight: '85%',
  },
  grabZone: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.md,
    gap: space.md,
  },
  /** La barrita de "esto se agarra". Gris de línea: es una guía, no un control. */
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
  },
  sheetScroll: { flexShrink: 1 },
  sheetContent: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.md },
  heading: { ...t.h1 },
  input: {
    ...t.numBig,
    color: colors.ink,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  quick: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  chipPressed: { backgroundColor: colors.line },
  chipText: { ...t.num, fontSize: 13, color: colors.ink },
  rows: { gap: 6, paddingVertical: space.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space.md,
  },
  rowLabel: { ...t.small, color: colors.muted },
  rowValue: { ...t.num, fontSize: 14, color: colors.muted },
  rowValueStrong: { fontSize: 18, color: colors.ink, fontWeight: '800' },
  error: { ...t.small, color: colors.danger },
  note: { ...t.small, fontSize: 12, color: colors.faint, lineHeight: 17 },
});

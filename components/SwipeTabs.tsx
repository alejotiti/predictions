import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TabRouter,
  createNavigatorFactory,
  useNavigationBuilder,
  type DefaultNavigatorOptions,
  type ParamListBase,
  type TabActionHelpers,
  type TabNavigationState,
  type TabRouterOptions,
} from '@react-navigation/native';
import { withLayoutContext } from 'expo-router';
import { ScreenHeader } from './ScreenHeader';
import { colors, type as t } from '../theme';

/**
 * Las pestañas del grupo, con las tres pantallas puestas una al lado de la
 * otra en una fila que se arrastra con el dedo.
 *
 * Por qué no el `Tabs` de expo-router: abajo es `@react-navigation/bottom-tabs`
 * y ahí sólo existe la pestaña que se ve, así que cambiar de una a otra es un
 * corte seco y no hay nada que arrastrar. Para que el gesto se sienta como el
 * de salir de un grupo —el contenido sigue al dedo, se puede dejar a mitad de
 * camino y vuelve solo— las pantallas tienen que estar montadas a la vez, y
 * eso lo decide el navegador. Así que el navegador lo dibujamos nosotros:
 * mismo `TabRouter` de react-navigation (las rutas, el estado y el botón de
 * atrás siguen siendo los suyos) y encima nuestra fila, nuestro header y
 * nuestra barra.
 *
 * Las pantallas no se enteran: siguen pidiendo lo suyo del header con
 * `navigation.setOptions`, igual que con cualquier navegador.
 */

export type SwipeTabOptions = {
  /** Lo que dice el header. */
  title?: string;
  /** `null` deja la pantalla afuera de la barra y afuera del deslizar. */
  href?: string | null;
  tabBarLabel?: string;
  tabBarIcon?: (props: { color: string }) => ReactNode;
  headerLeft?: () => ReactNode;
  headerRight?: () => ReactNode;
};

/**
 * Cuánto hay que arrastrar, en pantallas, para que el cambio quede hecho: un
 * quinto. Hasta ahí seguís donde estabas y la fila vuelve sola.
 */
const THRESHOLD = 0.2;
/**
 * Franja de la orilla izquierda donde manda el gesto nativo de volver, el que
 * sale del grupo. Un dedo que arranca ahí y va para la derecha es siempre ése,
 * nunca el nuestro.
 */
const EDGE = 40;
/**
 * Cuánto se tiene que mover para que ya se sepa que va para la derecha. Bien
 * poco a propósito: el nuestro recién agarra a los 16 px, así que soltarle el
 * toque al nativo antes de eso es lo que hace que el de volver salga siempre.
 */
const EDGE_HINT = 2;
/**
 * El resorte con el que la fila termina el viaje cuando el dedo suelta. Nada
 * de rebote: llega y se queda. Bajarle el resorte solo no alcanzaba, porque el
 * envión del dedo la hace pasarse igual por más frenada que esté, así que la
 * pasada se corta de raíz con `overshootClamping` y el frenado queda alto para
 * que ese corte no se note —llega despacio, no de golpe—. Lo elástico sigue
 * estando donde importa, que es mientras se arrastra: en las puntas la fila se
 * estira a la mitad y deja ver papel.
 */
const SPRING = { mass: 1, damping: 28, stiffness: 240, overshootClamping: true };
/** Alto de la barra, sin contar el margen de abajo del teléfono. */
const BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

type SwipeTabsProps = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  TabNavigationState<ParamListBase>,
  SwipeTabOptions,
  Record<string, never>,
  unknown
> &
  TabRouterOptions;

function SwipeTabsNavigator(props: SwipeTabsProps) {
  // Todo lo que llega va al builder tal cual —incluido el `id` que le pone
  // expo-router—: lo que este navegador hace distinto empieza después.
  const { state, descriptors, navigation, NavigationContent } = useNavigationBuilder<
    TabNavigationState<ParamListBase>,
    TabRouterOptions,
    TabActionHelpers<ParamListBase>,
    SwipeTabOptions,
    Record<string, never>
  >(TabRouter, props);

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const current = state.routes[state.index];
  const options = descriptors[current.key].options;

  // Las que están en la barra y se deslizan. El panel de árbitro no: entra con
  // `href: null` y se muestra solo, como una pantalla más adentro del grupo.
  const panes = state.routes.filter((r) => descriptors[r.key].options.href !== null);
  const index = panes.findIndex((r) => r.key === current.key);
  const last = panes.length - 1;

  // Una pantalla se monta cuando se la visita y cuando está al lado de la que
  // se está viendo: si sólo estuviera la del medio, al empezar a arrastrar no
  // asomaría nada. Montada se queda, así no pierde el scroll ni vuelve a pedir
  // todo cada vez que se pasa por al lado.
  const [visited, setVisited] = useState([current.key]);
  useEffect(() => {
    setVisited((keys) => (keys.includes(current.key) ? keys : [...keys, current.key]));
  }, [current.key]);

  /** Dónde queda la fila con esta pestaña: 0 la primera, -width la segunda. */
  const rest = -index * width;

  // Arranca ya puesta en su lugar y no en la primera: si se entra derecho al
  // ranking —desde una notificación, o volviendo al grupo— no se ve pasar el
  // feed antes.
  const x = useSharedValue(rest);
  /** El mismo `rest`, del lado del hilo de la animación. */
  const landing = useSharedValue(rest);
  /** Dónde lo mandó el dedo, cuando fue el dedo el que lo mandó. */
  const committed = useSharedValue<number | null>(null);
  /** Dónde tocó la pantalla, para saber si el toque nació en la orilla. */
  const touchX = useSharedValue(0);

  useEffect(() => {
    if (index < 0) return;
    landing.value = rest;
  }, [rest, index, landing]);

  // El viaje lo empieza siempre el hilo de la animación, nunca un efecto de
  // React: cuando el dedo suelta, el resorte ya arrancó con la velocidad con
  // la que venía. Acá sólo se atienden los cambios que no vinieron del gesto
  // —el botón de la barra, entrar desde afuera— y ésos son un corte seco: la
  // fila ya está puesta en la pestaña nueva cuando se dibuja. Deslizar es
  // arrastrar algo que sigue al dedo y por eso se anima; tocar un botón es
  // pedir una pantalla, y esperar a que las de al lado terminen de pasar sólo
  // demora el toque.
  useAnimatedReaction(
    () => landing.value,
    (to, previous) => {
      if (previous === null || to === previous) return;
      if (committed.value !== null) {
        committed.value = null;
        return;
      }
      x.value = to;
    }
  );

  function jump(to: number) {
    navigation.navigate(panes[to].name);
  }

  const swipe = Gesture.Pan()
    .enabled(index >= 0 && panes.length > 1)
    // Recién agarra cuando el dedo va claramente para el costado, y se cae si
    // arranca para arriba o para abajo: adentro de cada pantalla hay un
    // ScrollView y ahí manda él.
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onTouchesDown((e) => {
      'worklet';
      touchX.value = e.allTouches[0].absoluteX;
    })
    .onTouchesMove((e, manager) => {
      'worklet';
      if (touchX.value >= EDGE) return;
      // Nacido en la orilla y yéndose para la derecha: es el de salir del
      // grupo. No alcanza con quedarnos quietos —activarnos igual le saca el
      // toque al nativo y ahí el de volver no sale nunca—, así que este gesto
      // se cae y no compite.
      if (e.allTouches[0].absoluteX - touchX.value > EDGE_HINT) manager.fail();
    })
    .onUpdate((e) => {
      'worklet';
      const raw = rest + e.translationX;
      const min = -last * width;
      // Pasadas las puntas la fila no se traba: se estira a la mitad, y así se
      // siente que de ese lado no hay nada más.
      x.value = raw > 0 ? raw / 2 : raw < min ? min + (raw - min) / 2 : raw;
    })
    .onEnd((e) => {
      'worklet';
      const dir = e.translationX < 0 ? 1 : -1;
      // Sólo manda cuánto se arrastró. Un tirón corto y rápido no cambia de
      // pestaña por más envión que traiga: lo único que hace el envión es
      // terminar el viaje, para el lado que sea.
      const far = Math.abs(e.translationX) > width * THRESHOLD;
      const next = far ? Math.min(Math.max(index + dir, 0), last) : index;
      const to = -next * width;
      // El resorte sale con la velocidad con la que venía el dedo, así que
      // soltar no es un cambio de mano: la fila sigue de largo sola. Sale acá
      // mismo, sin esperar a que React se entere de la pestaña nueva.
      if (next !== index) {
        committed.value = to;
        runOnJS(jump)(next);
      }
      x.value = withSpring(to, { ...SPRING, velocity: e.velocityX });
    });

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <NavigationContent>
      <View style={styles.root}>
        <ScreenHeader
          left={options.headerLeft?.()}
          title={options.title}
          right={options.headerRight?.()}
        />

        {index < 0 ? (
          <View style={styles.pane}>{descriptors[current.key].render()}</View>
        ) : (
          <GestureDetector gesture={swipe}>
            <View style={styles.window}>
              <Animated.View style={[styles.row, { width: width * panes.length }, row]}>
                {panes.map((route, i) => (
                  <View key={route.key} style={[styles.pane, { width }]}>
                    {(visited.includes(route.key) || Math.abs(i - index) === 1) &&
                      descriptors[route.key].render()}
                  </View>
                ))}
              </Animated.View>
            </View>
          </GestureDetector>
        )}

        <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
          {panes.map((route, i) => {
            const tab = descriptors[route.key].options;
            const label = tab.tabBarLabel ?? tab.title ?? route.name;
            const color = i === index ? colors.ink : colors.muted;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: i === index }}
                accessibilityLabel={label}
                onPress={() => jump(i)}
                style={styles.tab}
              >
                {tab.tabBarIcon?.({ color })}
                <Text style={[styles.tabLabel, { color }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </NavigationContent>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  // La fila mide tres pantallas de ancho: lo que se sale se recorta acá.
  window: { flex: 1, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row' },
  pane: { flex: 1, backgroundColor: colors.paper },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  tab: { flex: 1, height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { ...t.tab },
});

export const SwipeTabs = withLayoutContext<
  SwipeTabOptions,
  typeof SwipeTabsNavigator,
  TabNavigationState<ParamListBase>,
  Record<string, never>
>(createNavigatorFactory(SwipeTabsNavigator)().Navigator);

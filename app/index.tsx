import { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, radius, shadow, space, type as t } from '../theme';
import { Button, Card, Empty } from '../components/ui';
import { GroupCardSkeleton } from '../components/Skeleton';
import { LeaveIcon, PlusIcon, QrCodeIcon } from '../components/icons';
import { useAuth } from '../lib/auth';
import { useGroups } from '../lib/groups';
import { points } from '../lib/format';
import type { GroupMembership } from '../lib/db/types';

/** Lo que se destapa al soltar. El paño rojo se estira más allá, pero vuelve acá. */
const LEAVE_WIDTH = 48;

/** Sólo listado y estado vacío: crear y unirse tienen pantalla propia. */
export default function Groups() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { groups, status, error, refreshing, refresh, pullToRefresh, leaveGroup } = useGroups();

  // "No tenés grupos" recién cuando la consulta terminó y volvió vacía (§7):
  // mientras tanto va el skeleton, nunca el estado vacío.
  const loading = status === 'loading';
  const failed = status === 'error';
  const empty = status === 'ready' && groups.length === 0;

  // Una sola fila corrida a la vez: apenas empezás a correr otra, la anterior se
  // cierra sola. Dos rojos abiertos a la vez se leen como una lista en modo
  // "borrar", y el toque que sigue termina saliendo del grupo equivocado.
  const openRow = useRef<SwipeableMethods | null>(null);

  function rowOpening(row: SwipeableMethods | null) {
    if (openRow.current && openRow.current !== row) openRow.current.close();
    openRow.current = row;
  }

  // Cerrar es asincrónico —el aviso llega cuando termina el resorte—, así que
  // para entonces la que está abierta puede ser ya otra: sólo se olvida la fila
  // si sigue siendo la que teníamos anotada.
  function rowClosed(row: SwipeableMethods | null) {
    if (openRow.current === row) openRow.current = null;
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.page, { paddingTop: insets.top + space.lg }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={pullToRefresh} tintColor={colors.muted} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.h1}>Tus grupos</Text>
        {/* Sin grupos, el que invita a crear es el botón grande de abajo. */}
        {groups.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crear un grupo"
            onPress={() => router.push('/groups/new')}
            hitSlop={space.sm}
            style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
          >
            <PlusIcon color="#fff" />
          </Pressable>
        )}
      </View>

      {loading && (
        <>
          <GroupCardSkeleton />
          <GroupCardSkeleton />
        </>
      )}

      {failed && (
        <Card style={{ gap: space.md }}>
          <Text style={styles.errorText}>{error ?? 'No pudimos cargar tus grupos.'}</Text>
          <Button title="Reintentar" tone="ghost" onPress={refresh} />
        </Card>
      )}

      {empty && (
        <Empty title="Todavía no estás en ningún grupo" hint="Creá el primero para empezar." />
      )}

      {groups.map((membership) => (
        <GroupRow
          key={membership.group.id}
          membership={membership}
          onOpen={() => router.push(`/group/${membership.group.id}`)}
          onLeave={() => leaveGroup(membership.group.id)}
          onSwipeStart={rowOpening}
          onSwipeClosed={rowClosed}
        />
      ))}

      {!loading && (
        <View style={styles.actions}>
          {/* Con grupos ya creados, el ＋ del header alcanza. */}
          {empty && (
            <Button
              title="＋  Crear un grupo"
              onPress={() => router.push('/groups/new')}
              style={styles.action}
            />
          )}
          <Button
            title="Unirme con código"
            tone="ghost"
            icon={(color) => <QrCodeIcon color={color} />}
            onPress={() => router.push('/groups/join')}
            style={styles.action}
          />
          <Pressable
            accessibilityRole="button"
            onPress={signOut}
            style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

/**
 * Una tarjeta de grupo que se corre para la izquierda y deja ver "Salir", como
 * en WhatsApp. Salir es irreversible cuando sos el último —el grupo se borra y
 * el código queda libre—, así que nunca sale del gesto solo: siempre pasa por
 * una confirmación que dice qué va a pasar en este caso puntual.
 */
function GroupRow({
  membership: { group, memberCount, balance, role },
  onOpen,
  onLeave,
  onSwipeStart,
  onSwipeClosed,
}: {
  membership: GroupMembership;
  onOpen: () => void;
  onLeave: () => Promise<void>;
  /** Avisa que esta fila se está corriendo, para que la lista cierre la otra. */
  onSwipeStart: (row: SwipeableMethods | null) => void;
  onSwipeClosed: (row: SwipeableMethods | null) => void;
}) {
  // `memberCount` es best-effort: si no lo pudimos contar va el texto genérico,
  // que no promete nada sobre lo que pasa con el grupo.
  const last = memberCount === 1;
  // Si la fila está corrida, para que la tarjeta y el botón se lean como una
  // sola pieza y no como dos cosas apoyadas una al lado de la otra.
  const [swiped, setSwiped] = useState(false);
  // Para que la lista pueda cerrarla cuando se empiece a correr otra.
  const row = useRef<SwipeableMethods | null>(null);

  function confirm(swipeable: SwipeableMethods) {
    const message = last
      ? 'Sos el único que queda adentro. Al salir, el grupo se borra para siempre' +
        (group.invite_code ? ` y el código ${group.invite_code} queda libre.` : '.')
      : role === 'member'
        ? 'Vas a dejar de ver sus predicciones. Podés volver a entrar con el código.'
        : 'Vas a dejar de ver sus predicciones y el arbitraje pasa a otro integrante.';

    Alert.alert(
      `Salir de ${group.name}`,
      message,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => swipeable.close() },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            try {
              await onLeave();
            } catch (e) {
              swipeable.close();
              Alert.alert(
                'No pudimos sacarte del grupo',
                e instanceof Error ? e.message : 'Probá de nuevo en un rato.',
              );
            }
          },
        },
      ],
      // En Android se sale del diálogo tocando afuera, y eso no dispara ningún
      // botón: sin esto la fila se quedaría abierta mostrando el rojo.
      { onDismiss: () => swipeable.close() },
    );
  }

  return (
    // La sombra va en un envoltorio y no en la tarjeta: el Swipeable recorta lo
    // que se sale de su contenedor, así que adentro la sombra no se vería. Acá
    // afuera se dibuja entera y el recorte de adentro sigue haciendo lo suyo.
    <View style={styles.swipeShadow}>
      <ReanimatedSwipeable
        ref={row}
        containerStyle={styles.swipe}
        friction={2}
        rightThreshold={40}
        // Se puede seguir corriendo más allá del botón, con el doble de resistencia
        // que antes del tope: se nota que estás estirando y no arrastrando.
        overshootFriction={2}
        // El resorte de fábrica está tan amortiguado que no rebota nunca. Éste
        // vuelve pasándose un poco: es lo que hace que se sienta elástico y no
        // que la fila se acomoda sola. `velocity` no se toca, así el envión del
        // dedo sigue contando.
        animationOptions={{ mass: 1, damping: 18, stiffness: 240, overshootClamping: false }}
        // La tarjeta pierde el radio de la derecha apenas empieza el gesto, y lo
        // recupera recién con la fila ya cerrada del todo. Las dos puntas importan:
        // en cualquier momento en que haya rojo a la derecha, una esquina redonda
        // deja ver una medialuna entre la tarjeta y el botón. Cerrada y en reposo
        // no hay rojo que asome, así que ahí el radio vuelve sin que se note.
        onSwipeableOpenStartDrag={() => {
          setSwiped(true);
          onSwipeStart(row.current);
        }}
        onSwipeableWillOpen={() => {
          setSwiped(true);
          onSwipeStart(row.current);
        }}
        onSwipeableClose={() => {
          setSwiped(false);
          onSwipeClosed(row.current);
        }}
        renderRightActions={(_progress, translation, swipeable) => (
          <LeaveAction
            translation={translation}
            label={`Salir de ${group.name}`}
            onPress={() => confirm(swipeable)}
          />
        )}
      >
        <Pressable onPress={onOpen}>
          <Card style={[styles.groupCard, swiped && styles.cardSwiped]}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupPoints}>{points(balance)} pts</Text>
            </View>
            {!!group.description && (
              <Text style={styles.groupDescription} numberOfLines={2}>
                {group.description}
              </Text>
            )}
            <Text style={styles.groupMeta}>
              {memberCount !== null && `${memberCount} ${memberCount === 1 ? 'integrante' : 'integrantes'}`}
              {memberCount !== null && !!group.invite_code && ' · '}
              {!!group.invite_code && `código ${group.invite_code}`}
            </Text>
          </Card>
        </Pressable>
        </ReanimatedSwipeable>
    </View>
  );
}

/**
 * El botón de salir, con un paño rojo detrás que se estira.
 *
 * El botón mide siempre lo mismo a propósito: de su ancho medido sale a dónde
 * se abre la fila, así que si creciera, la fila abierta crecería con él. El que
 * se estira es el paño, que va absoluto y por eso no entra en esa medición.
 * Arranca en cero pegado al borde izquierdo del botón y se agranda con lo que
 * el dedo siga corriendo; al soltar, la fila vuelve a `LEAVE_WIDTH` y el paño
 * se cierra solo, porque su ancho no es más que la resta.
 */
function LeaveAction({
  translation,
  label,
  onPress,
}: {
  /** Cuánto está corrida la fila. Negativo cuando se va para la izquierda. */
  translation: SharedValue<number>;
  label: string;
  onPress: () => void;
}) {
  const stretch = useAnimatedStyle(() => ({
    width: Math.max(0, -translation.value - LEAVE_WIDTH),
  }));

  return (
    <>
      <Animated.View style={[styles.leaveStretch, stretch]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.leave, pressed && { opacity: 0.85 }]}
      >
        <LeaveIcon color="#fff" />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  h1: { ...t.display, color: colors.ink, flexShrink: 1 },
  fab: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // El radio va acá y no en la tarjeta: el Swipeable ya recorta lo que se sale
  // del contenedor, así que poniéndoselo acá el rojo termina redondeado por
  // afuera igual que la tarjeta, y del lado en que se tocan los dos van rectos.
  swipeShadow: { borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow.card },
  // La sombra ya la pone el envoltorio: repetirla acá adentro no se vería y en
  // Android dibujaría un segundo halo contra el recorte.
  groupCard: { gap: 6, shadowOpacity: 0, elevation: 0 },
  swipe: { borderRadius: radius.lg },
  cardSwiped: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  leave: {
    width: LEAVE_WIDTH,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pegado al borde izquierdo del botón y hacia la izquierda. Va absoluto para
  // quedar fuera de la medición del ancho de la acción.
  leaveStretch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: LEAVE_WIDTH,
    backgroundColor: colors.danger,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  groupName: { ...t.title, color: colors.ink, flexShrink: 1 },
  groupPoints: { ...t.num, color: colors.ink },
  groupDescription: { ...t.small, fontSize: 14, color: colors.muted },
  groupMeta: { ...t.small, fontSize: 12, color: colors.faint },
  errorText: { ...t.body, color: colors.danger },
  actions: { marginTop: space.lg, gap: space.sm },
  action: { marginHorizontal: space.xl, paddingVertical: 11 },
  signOut: { alignSelf: 'center', paddingVertical: space.md, paddingHorizontal: space.lg },
  signOutText: { ...t.small, fontWeight: '600', color: colors.muted },
});

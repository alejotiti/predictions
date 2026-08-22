import { useLocalSearchParams } from 'expo-router';
import { HomeIcon, PlusIcon, TrophyIcon } from '../../../components/icons';
import { HeaderGroups } from '../../../components/HeaderGroups';
import { SwipeTabs } from '../../../components/SwipeTabs';
import { GroupIdProvider, useGroups } from '../../../lib/groups';

export default function GroupLayout() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  // El nombre del header sale de la lista de grupos que ya está en memoria.
  const { groups } = useGroups();
  const group = groups.find((m) => m.group.id === groupId)?.group;

  return (
    // Las pestañas de adentro leen el grupo de acá: a ellas el router no les
    // pasa el param (ver GroupIdProvider en lib/groups.tsx).
    <GroupIdProvider value={groupId}>
      {/* No es el `Tabs` de expo-router sino el nuestro, que además se desliza.
          El porqué está en components/SwipeTabs.tsx. El saldo de la derecha lo
          pone cada pantalla con `navigation.setOptions`, como antes. */}
      <SwipeTabs screenOptions={{ headerLeft: () => <HeaderGroups /> }}>
        <SwipeTabs.Screen
          name="index"
          options={{
            title: group?.name ?? 'Grupo',
            tabBarLabel: 'Inicio',
            tabBarIcon: ({ color }) => <HomeIcon color={color} size={24} />,
          }}
        />
        <SwipeTabs.Screen
          name="create"
          options={{
            title: 'Nueva predicción',
            tabBarLabel: 'Crear',
            tabBarIcon: ({ color }) => <PlusIcon color={color} size={24} />,
          }}
        />
        <SwipeTabs.Screen
          name="ranking"
          options={{
            title: 'Ranking',
            tabBarLabel: 'Ranking',
            tabBarIcon: ({ color }) => <TrophyIcon color={color} size={24} />,
          }}
        />
        {/* Panel de árbitro: se entra desde el feed, no ocupa lugar en la barra
            ni se llega deslizando. */}
        <SwipeTabs.Screen name="admin" options={{ href: null, title: 'Panel de árbitro' }} />
      </SwipeTabs>
    </GroupIdProvider>
  );
}

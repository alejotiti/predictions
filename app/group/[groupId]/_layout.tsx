import { Tabs, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../../theme';
import { useStore } from '../../../lib/mock/store';

function Icon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ fontSize: 18, color }}>{glyph}</Text>;
}

export default function GroupLayout() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { state } = useStore();
  const group = state.groups.find((g) => g.id === groupId);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: group?.name ?? 'Grupo',
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color }) => <Icon glyph="◧" color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Nueva predicción',
          tabBarLabel: 'Crear',
          tabBarIcon: ({ color }) => <Icon glyph="＋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'Ranking',
          tabBarLabel: 'Ranking',
          tabBarIcon: ({ color }) => <Icon glyph="▤" color={color} />,
        }}
      />
      {/* Panel de árbitro: se entra desde el feed, no ocupa lugar en la barra */}
      <Tabs.Screen name="admin" options={{ href: null, title: 'Panel de árbitro' }} />
    </Tabs>
  );
}

import { useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from 'expo-router';
import { colors, space, type as t } from '../../../theme';
import { Button, Card } from '../../../components/ui';
import { HeaderBalance } from '../../../components/HeaderBalance';
import { RankingRowSkeleton } from '../../../components/Skeleton';
import { useRanking } from '../../../lib/predictions';
import { useGroupId } from '../../../lib/groups';
import { nameOf } from '../../../lib/profiles';
import { points } from '../../../lib/format';

export default function Ranking() {
  const groupId = useGroupId();
  const navigation = useNavigation();
  // El orden y los saldos los calcula la base sumando el ledger: acá no se
  // deriva nada, sólo se pinta.
  const { rows, names, userId, status, error, refreshing, refresh, pullToRefresh } =
    useRanking(groupId);

  // El saldo propio ya viene adentro del ranking: es el mismo número del
  // ledger que la fila propia, así que no se pide de nuevo para el header.
  const loading = status === 'loading';
  const balance = rows.find((r) => r.user_id === userId)?.balance ?? 0;

  // Las opciones del header las pone el layout de las pestañas, así que el
  // saldo se agrega desde acá, igual que en el feed.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderBalance balance={balance} loading={loading} />,
    });
  }, [navigation, balance, loading]);

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={pullToRefresh} tintColor={colors.muted} />
      }
    >
      {/* Cinco filas de hueso: el ranking típico de un grupo entra en una
          pantalla, así que la lista casi no se mueve cuando llegan los saldos. */}
      {loading && [0, 1, 2, 3, 4].map((i) => <RankingRowSkeleton key={i} />)}

      {status === 'error' && (
        <Card style={{ gap: space.md }}>
          <Text style={styles.errorText}>{error ?? 'No pudimos cargar el ranking.'}</Text>
          <Button title="Reintentar" tone="ghost" onPress={refresh} />
        </Card>
      )}

      {rows.map((r, i) => (
        <Card key={r.user_id} style={[styles.row, r.user_id === userId && styles.rowMe]}>
          <Text style={styles.pos}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{nameOf(names, r.user_id)}</Text>
            <Text style={styles.role}>{r.role === 'member' ? 'Miembro' : 'Árbitro'}</Text>
          </View>
          <Text style={styles.pts}>{points(r.balance)}</Text>
        </Card>
      ))}

      {status === 'ready' && (
        <Text style={styles.note}>Ordenado por saldo de puntos del grupo.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl },
  // El borde va siempre, transparente: si apareciera sólo en la fila propia,
  // esa fila mediría 2 px más que las otras y la columna quedaría torcida.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  // El propio se marca con un filete de tinta: es la única tarjeta con borde
  // visible en toda la app, y por eso se encuentra de un vistazo.
  rowMe: { borderColor: colors.ink },
  pos: { ...t.num, fontSize: 13, color: colors.faint, width: 22 },
  name: { ...t.body, fontWeight: '600', color: colors.ink },
  role: { ...t.small, fontSize: 11, color: colors.faint },
  pts: { ...t.num, fontSize: 17, color: colors.ink },
  note: { ...t.small, fontSize: 12, color: colors.faint, marginTop: space.md },
  errorText: { ...t.body, color: colors.danger },
});

import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, type as t } from '../theme';
import { poolPercents, type Pool, type Side } from '../lib/domain/market';
import { points, percent } from '../lib/format';

/**
 * La barra es una balanza del pozo, no un gráfico de votos (§4.4).
 * Cada lado lleva su porcentaje y sus puntos adentro, y si el usuario tiene
 * posición se marca con una muesca sobre su lado.
 */
export function PoolBar({
  pool,
  myside,
  compact = false,
}: {
  pool: Pool;
  myside?: Side;
  compact?: boolean;
}) {
  const p = poolPercents(pool);
  const empty = pool.yes + pool.no === 0;
  const h = compact ? 34 : 46;

  return (
    <View>
      <View style={[styles.bar, { height: h }]}>
        <View style={[styles.half, { flex: Math.max(p.yes, 0.001), backgroundColor: colors.yes }]}>
          {p.yes > 0.18 && (
            <>
              <Text style={styles.sideLabel}>SÍ {percent(p.yes)}</Text>
              {!compact && <Text style={styles.sidePoints}>{points(pool.yes)}</Text>}
            </>
          )}
        </View>
        <View style={[styles.half, { flex: Math.max(p.no, 0.001), backgroundColor: colors.no }]}>
          {p.no > 0.18 && (
            <>
              <Text style={styles.sideLabel}>NO {percent(p.no)}</Text>
              {!compact && <Text style={styles.sidePoints}>{points(pool.no)}</Text>}
            </>
          )}
        </View>
      </View>
      {empty && <Text style={styles.emptyHint}>Todavía no apostó nadie</Text>}
      {myside && (
        <View style={styles.notchRow}>
          <View style={{ flex: myside === 'YES' ? 0 : 1 }} />
          <Text style={[styles.notch, { color: myside === 'YES' ? colors.yes : colors.no }]}>
            ▲ vos
          </Text>
          <View style={{ flex: myside === 'YES' ? 1 : 0 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  half: { justifyContent: 'center', paddingHorizontal: 10 },
  sideLabel: { ...t.label, color: '#fff' },
  sidePoints: { fontFamily: t.points.fontFamily, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  emptyHint: { ...t.body, fontSize: 12, color: colors.muted, marginTop: 6 },
  notchRow: { flexDirection: 'row', marginTop: 4 },
  notch: { fontSize: 11, fontWeight: '700' },
});

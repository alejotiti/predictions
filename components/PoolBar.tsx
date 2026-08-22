import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, type as t } from '../theme';
import { poolPercents, totalPool, type Pool } from '../lib/domain/market';
import { points, percent } from '../lib/format';

// El registro del texto de adentro de la barra: mismo cuerpo y peso lo llene un
// lado o la leyenda de vacía, así las dos barras son la misma pieza.
const barLabel = { fontSize: 13, fontWeight: '800', letterSpacing: -0.1 } as const;

/**
 * La barra es una balanza del pozo, no un gráfico de votos (§4.4).
 * Cada lado lleva su porcentaje y sus puntos adentro. La posición propia no se
 * marca acá: la dice `MyPosition`, que va justo abajo en la tarjeta y en el
 * detalle.
 */
export function PoolBar({ pool, compact = false }: { pool: Pool; compact?: boolean }) {
  const h = compact ? 34 : 44;

  // Sin un solo punto apostado no hay balanza que mostrar. Un 50/50 azul y
  // naranja sería mentira: dibuja dos lados empatados donde todavía no hay
  // nada. La barra se apaga a gris y dice que está vacía, con el mismo cuerpo
  // y peso que los rótulos de adentro de la barra llena —es el mismo renglón,
  // en el registro apagado— y nunca en versalita: eso la leería como un rótulo
  // de sección y no como el estado de la barra.
  if (totalPool(pool) === 0) {
    return (
      <View style={[styles.bar, styles.emptyBar, { height: h }]}>
        <Text style={styles.emptyLabel}>Sin apuestas todavía</Text>
      </View>
    );
  }

  const p = poolPercents(pool);

  return (
    <View style={[styles.bar, { height: h }]}>
      {/* El lado sin un solo punto no se dibuja: no alcanza con `flex: 0`,
          porque eso deja `flexBasis: auto` y la franja igual mide su propio
          padding —una astilla de color en el borde— y la barra al 100 % no se
          lee maciza. */}
      {p.yes > 0 && (
        <View style={[styles.half, { flex: p.yes, backgroundColor: colors.yes }]}>
          {p.yes > 0.18 && (
            <>
              <Text style={styles.sideLabel}>SÍ {percent(p.yes)}</Text>
              {!compact && <Text style={styles.sidePoints}>{points(pool.yes)}</Text>}
            </>
          )}
        </View>
      )}
      {p.no > 0 && (
        <View style={[styles.half, styles.halfNo, { flex: p.no, backgroundColor: colors.no }]}>
          {p.no > 0.18 && (
            <>
              <Text style={styles.sideLabel}>{percent(p.no)} NO</Text>
              {!compact && <Text style={styles.sidePoints}>{points(pool.no)}</Text>}
            </>
          )}
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
  // Vacía va un punto más oscura que `surfaceAlt`: sobre la tarjeta blanca
  // tiene que leerse como una franja apagada, no como un hueco.
  emptyBar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.line },
  emptyLabel: { ...barLabel, color: colors.muted },
  half: { justifyContent: 'center', paddingHorizontal: 12, gap: 1 },
  // El lado NO se lee hacia el borde: su rotulo y sus puntos se anclan a la
  // derecha, que es donde termina su franja.
  halfNo: { alignItems: 'flex-end' },
  // El lado va con el mismo peso que un rótulo pero sin versalita: adentro de
  // la barra el texto ya está aislado, y en mayúsculas espaciadas se leería
  // como un rótulo de sección flotando sobre color.
  sideLabel: { ...barLabel, color: '#fff' },
  sidePoints: { ...t.num, fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
});

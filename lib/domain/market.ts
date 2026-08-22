/**
 * Lógica pari-mutuel pura (§4.3, §4.4). Sin dependencias de React ni de red.
 *
 * IMPORTANTE: en producción el payout real lo calcula y ejecuta la base de
 * datos dentro de una transacción atómica (§10). Este módulo existe para:
 *   1. el retorno estimado que se muestra en la UI,
 *   2. los porcentajes del pozo,
 *   3. tener una implementación de referencia testeable del reparto,
 *      que debe dar exactamente lo mismo que la RPC de SQL.
 */

export type Side = 'YES' | 'NO';

export type Pool = { yes: number; no: number };

export const totalPool = (p: Pool): number => p.yes + p.no;

export const sideTotal = (p: Pool, side: Side): number =>
  side === 'YES' ? p.yes : p.no;

export function addToPool(p: Pool, side: Side, amount: number): Pool {
  return side === 'YES'
    ? { yes: p.yes + amount, no: p.no }
    : { yes: p.yes, no: p.no + amount };
}

/** Proporción del pozo por lado. Pozo vacío => 50/50 como estado neutro de UI. */
export function poolPercents(p: Pool): { yes: number; no: number } {
  const total = totalPool(p);
  if (total <= 0) return { yes: 0.5, no: 0.5 };
  return { yes: p.yes / total, no: p.no / total };
}

/**
 * Retorno estimado si el usuario suma `stake` puntos a `side` y ese lado gana.
 * Incluye la propia apuesta dentro del pozo, que es lo que el usuario ve.
 * `currentStake` son los puntos que ya tiene puestos de ese mismo lado.
 */
export function estimatedPayout(
  pool: Pool,
  side: Side,
  stake: number,
  currentStake = 0,
): number {
  const after = addToPool(pool, side, stake);
  const winningTotal = sideTotal(after, side);
  const mine = currentStake + stake;
  if (mine <= 0 || winningTotal <= 0) return 0;
  return (mine / winningTotal) * totalPool(after);
}

/** Multiplicador estimado sobre lo apostado. 1x = recupera lo puesto. */
export function estimatedMultiplier(
  pool: Pool,
  side: Side,
  stake: number,
  currentStake = 0,
): number {
  const mine = currentStake + stake;
  if (mine <= 0) return 0;
  return estimatedPayout(pool, side, stake, currentStake) / mine;
}

export type Position = { userId: string; stake: number };

/**
 * Reparte el pozo entero entre los ganadores, en enteros, sin perder ni
 * inventar puntos (§4.3). Parte entera primero y el resto por mayor residuo,
 * con desempate determinista (residuo desc, stake desc, userId asc) para que
 * dos ejecuciones den siempre el mismo resultado.
 *
 * Casos cubiertos (§14):
 *  - sin ganadores => mapa vacío, no hay payout, los puntos salen de circulación
 *  - todos del lado ganador => cada uno recupera exactamente lo apostado
 *  - la suma repartida es siempre igual al pozo cuando hay ganadores
 */
export function distributePool(
  pool: number,
  winners: Position[],
): Map<string, number> {
  const result = new Map<string, number>();
  const winningTotal = winners.reduce((acc, w) => acc + w.stake, 0);
  if (winners.length === 0 || winningTotal <= 0 || pool <= 0) return result;

  // Todo en enteros a propósito. Calcular el residuo como `exact - base` en
  // punto flotante rompe el desempate: dos ganadores con el mismo residuo
  // exacto dan residuos distintos según la magnitud de su parte entera, y el
  // orden termina dependiendo del error de redondeo. Con el numerador sin
  // dividir y un módulo, el residuo es exacto y coincide con el de la RPC.
  const rows = winners.map((w) => {
    const numerator = w.stake * pool;
    return {
      userId: w.userId,
      stake: w.stake,
      base: Math.floor(numerator / winningTotal),
      remainder: numerator % winningTotal,
    };
  });

  let leftover = pool - rows.reduce((acc, r) => acc + r.base, 0);

  const order = [...rows].sort(
    (a, b) =>
      b.remainder - a.remainder ||
      b.stake - a.stake ||
      a.userId.localeCompare(b.userId),
  );

  for (const row of order) {
    if (leftover <= 0) break;
    row.base += 1;
    leftover -= 1;
  }

  for (const row of rows) result.set(row.userId, row.base);
  return result;
}

/** Devolución por anulación (§5.5): cada uno recupera exactamente lo suyo. */
export function refundAll(positions: Position[]): Map<string, number> {
  return new Map(positions.map((p) => [p.userId, p.stake]));
}

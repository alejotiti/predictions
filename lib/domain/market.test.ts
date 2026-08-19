import assert from 'node:assert';
import { distributePool, estimatedPayout, poolPercents, refundAll } from './market';

// §4.3 ejemplo del documento: SI 300 / NO 700, gana SI, jugador con 100
const d = distributePool(1000, [
  { userId: 'a', stake: 100 },
  { userId: 'b', stake: 200 },
]);
assert.strictEqual(d.get('a'), 333);
assert.strictEqual(d.get('b'), 667);
assert.strictEqual([...d.values()].reduce((x, y) => x + y, 0), 1000);

// §4.4 ejemplo: nueve de 10 a SI, uno de 500 a NO -> ~15/85
const p = poolPercents({ yes: 90, no: 500 });
assert.strictEqual(Math.round(p.yes * 100), 15);
assert.strictEqual(Math.round(p.no * 100), 85);

// nadie del lado perdedor -> cada ganador recupera exactamente lo suyo
const same = distributePool(300, [
  { userId: 'a', stake: 100 },
  { userId: 'b', stake: 200 },
]);
assert.strictEqual(same.get('a'), 100);
assert.strictEqual(same.get('b'), 200);

// sin ganadores -> no hay payout
assert.strictEqual(distributePool(1000, []).size, 0);

// reparto nunca supera el pozo, con residuos feos
for (const pool of [1000, 997, 1, 55555]) {
  const w = [
    { userId: 'a', stake: 3 },
    { userId: 'b', stake: 3 },
    { userId: 'c', stake: 3 },
    { userId: 'd', stake: 1 },
  ];
  const r = distributePool(pool, w);
  const sum = [...r.values()].reduce((x, y) => x + y, 0);
  assert.strictEqual(sum, pool, `pozo ${pool} repartio ${sum}`);
  for (const v of r.values()) assert.ok(v >= 0);
}

// determinismo
const a1 = JSON.stringify([...distributePool(1000, [{ userId: 'x', stake: 5 }, { userId: 'y', stake: 5 }, { userId: 'z', stake: 5 }])].sort());
const a2 = JSON.stringify([...distributePool(1000, [{ userId: 'z', stake: 5 }, { userId: 'y', stake: 5 }, { userId: 'x', stake: 5 }])].sort());
assert.strictEqual(a1, a2);

// retorno estimado incluye la propia apuesta
assert.ok(Math.abs(estimatedPayout({ yes: 200, no: 700 }, 'YES', 100) - 1000 / 3) < 1e-9);
assert.strictEqual(estimatedPayout({ yes: 0, no: 0 }, 'YES', 100), 100);

// refund
assert.strictEqual(refundAll([{ userId: 'a', stake: 42 }]).get('a'), 42);

console.log('todos los tests de mercado pasan');

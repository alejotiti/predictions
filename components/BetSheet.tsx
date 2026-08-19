import { useState } from 'react';
import { View, Text, Modal, TextInput, StyleSheet, Pressable } from 'react-native';
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
  const [raw, setRaw] = useState('');
  const amount = Number.parseInt(raw || '0', 10) || 0;
  const overBalance = amount > balance;
  const valid = amount > 0 && !overBalance;

  const payout = estimatedPayout(pool, side, amount, currentStake);
  const mult = estimatedMultiplier(pool, side, amount, currentStake);
  const tone = side === 'YES' ? colors.yes : colors.no;

  function close() {
    setRaw('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={styles.sheet}>
        <Text style={[styles.heading, { color: tone }]}>
          Apostar a {side === 'YES' ? 'SÍ' : 'NO'}
        </Text>

        <Label>Puntos</Label>
        <TextInput
          value={raw}
          onChangeText={(v) => setRaw(v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.line}
          style={[styles.input, overBalance && { borderColor: colors.danger }]}
          autoFocus
        />

        <View style={styles.quick}>
          {QUICK.map((q) => (
            <Pressable
              key={q}
              onPress={() => setRaw(String(q))}
              disabled={q > balance}
              style={[styles.chip, q > balance && { opacity: 0.3 }]}
            >
              <Text style={styles.chipText}>{q}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setRaw(String(balance))} style={styles.chip}>
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
          <Row label="Multiplicador estimado" value={amount > 0 ? `${mult.toFixed(2)}x` : '—'} />
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
          title={valid ? `Apostar ${points(amount)} a ${side === 'YES' ? 'SÍ' : 'NO'}` : 'Apostar'}
          tone={side === 'YES' ? 'yes' : 'no'}
          disabled={!valid}
          onPress={() => {
            onConfirm(amount);
            setRaw('');
          }}
        />
        <Button title="Cancelar" tone="ghost" onPress={close} />
      </View>
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && { fontSize: 18, color: colors.ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,24,32,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    padding: space.xl,
    paddingBottom: space.xxl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: space.md,
  },
  heading: { ...t.title },
  input: {
    ...t.pointsBig,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  quick: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
  },
  chipText: { ...t.points, fontSize: 13, color: colors.ink },
  rows: { gap: 6, paddingVertical: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowLabel: { ...t.body, fontSize: 13, color: colors.muted },
  rowValue: { ...t.points, color: colors.muted },
  error: { ...t.body, fontSize: 13, color: colors.danger },
  note: { ...t.body, fontSize: 12, color: colors.muted, lineHeight: 17 },
});

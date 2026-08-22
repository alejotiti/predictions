import { useLayoutEffect, useState } from 'react';
import { Text, ScrollView, TextInput, StyleSheet, Pressable, Platform } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors, radius, space, type as t } from '../../../theme';
import { Button, Card, Label } from '../../../components/ui';
import { HeaderBalance } from '../../../components/HeaderBalance';
import { createPoll, useGroupBalance } from '../../../lib/predictions';
import { useGroupId } from '../../../lib/groups';
import { longDateTime } from '../../../lib/format';

/** El árbitro tiene 24 h desde el cierre para aceptar o negar lo que dice el creador. */
const REVIEW_HOURS = 24;

export default function CreatePoll() {
  const groupId = useGroupId();
  const router = useRouter();
  const navigation = useNavigation();
  // Esta pantalla no muestra ningún otro dato del ledger, pero el saldo va
  // arriba a la derecha en todas (DESIGN.md), así que lo pide sólo para eso.
  const { balance, status: balanceStatus } = useGroupBalance(groupId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [closesAt, setClosesAt] = useState(() => new Date(Date.now() + 24 * 3600_000));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outcomeAt = new Date(closesAt.getTime() + REVIEW_HOURS * 3600_000);
  const future = closesAt.getTime() > Date.now();
  const valid = !!groupId && title.trim().length > 3 && future;

  // Las opciones del header las pone el layout de las pestañas, así que el
  // saldo se agrega desde acá, igual que en el feed.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderBalance balance={balance} loading={balanceStatus === 'loading'} />
      ),
    });
  }, [navigation, balance, balanceStatus]);

  function openPicker() {
    if (Platform.OS !== 'android') {
      setPickerOpen((open) => !open);
      return;
    }
    // En Android el sistema pide fecha y hora en dos pasos.
    DateTimePickerAndroid.open({
      value: closesAt,
      mode: 'date',
      minimumDate: new Date(),
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent, withTime) => {
            if (timeEvent.type === 'set' && withTime) setClosesAt(withTime);
          },
        });
      },
    });
  }

  async function submit() {
    if (!groupId) return;
    setSending(true);
    setError(null);
    try {
      await createPoll({
        groupId,
        title,
        description,
        closesAt,
        outcomeDeadline: outcomeAt,
      });
      setTitle('');
      setDescription('');
      router.push(`/group/${groupId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos crear la predicción.');
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: space.md }}>
        <Label>La predicción</Label>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ej: El Pelado se saca 10 en el escrito"
          placeholderTextColor={colors.faint}
          style={styles.input}
          multiline
        />
        <Label>Cómo se decide (opcional)</Label>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Qué cuenta como SÍ y qué cuenta como NO"
          placeholderTextColor={colors.faint}
          style={[styles.input, { minHeight: 70 }]}
          multiline
        />
      </Card>

      <Card style={{ gap: space.md }}>
        <Label>Las apuestas cierran</Label>
        <Pressable onPress={openPicker} style={styles.picker}>
          <Text style={styles.pickerText}>{longDateTime(closesAt)}</Text>
        </Pressable>
        {pickerOpen && Platform.OS !== 'android' && (
          <DateTimePicker
            value={closesAt}
            mode="datetime"
            display="inline"
            locale="es-AR"
            minimumDate={new Date()}
            // El calendario se pinta solo según el modo del celular: con el
            // teléfono en oscuro escribe en blanco sobre nuestro papel claro y
            // no se lee nada. La app es clara siempre, así que el picker también.
            themeVariant="light"
            accentColor={colors.ink}
            textColor={colors.ink}
            onChange={(_event, date) => date && setClosesAt(date)}
          />
        )}
        {!future && (
          <Text style={styles.error}>El cierre tiene que ser más adelante que ahora.</Text>
        )}
        <Text style={styles.hint}>
          El resultado se sabe {REVIEW_HOURS} h después del cierre: ese es el tiempo que tiene
          el árbitro para aceptar o negar lo que diga el creador. Vence el{' '}
          {longDateTime(outcomeAt)}.
        </Text>
      </Card>

      <Text style={styles.hint}>
        Al enviarla queda esperando la aprobación del árbitro. Hasta entonces nadie puede apostar.
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        title={sending ? 'Creando…' : 'Crear predicción'}
        onPress={submit}
        disabled={!valid || sending}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  input: {
    ...t.body,
    color: colors.ink,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  picker: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 14,
  },
  pickerText: { ...t.body, fontWeight: '600', color: colors.ink },
  hint: { ...t.small, fontSize: 12, color: colors.faint, lineHeight: 17 },
  error: { ...t.small, color: colors.danger },
});

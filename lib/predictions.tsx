/**
 * Lo de adentro del grupo contra Supabase: predicciones, apuestas, ledger y chat.
 *
 * No hay provider ni store global: cada pantalla pide lo que necesita y se
 * refresca cuando vuelve al foco. Es la opción más simple que cumple, y evita
 * tener una copia del estado del servidor que haya que mantener sincronizada.
 *
 * Las mutaciones son todas RPC. La base revalida todo lo que la pantalla ya
 * chequeó, porque el cliente no es autoridad sobre saldo, cierre ni payout (§15).
 * Los `raise exception` de esas RPC llegan como P0001 y `dbErrorMessage` los
 * muestra tal cual: el texto del error lo escribe la base, no la pantalla.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from './supabase';
import { dbErrorMessage } from './errors';
import { useAuth } from './auth';
import { fetchNames, type NameMap } from './profiles';
import type {
  Bet,
  Message,
  Poll,
  PollWithBets,
  RankingRow,
  Role,
} from './db/types';
import type { Pool, Side } from './domain/market';

export type LoadStatus = 'loading' | 'ready' | 'error';

const POLL_COLUMNS =
  'id, group_id, creator_id, title, description, status, betting_closes_at, ' +
  'outcome_deadline, subject_ids, proposed_outcome, proposed_by, created_at';

const BET_COLUMNS = 'bets(poll_id, user_id, side, amount)';
const MESSAGE_COLUMNS = 'messages(id, poll_id, user_id, body, created_at)';

// ---------------------------------------------------------------------------
// Derivados del lado del cliente. Son sólo para pintar: el pozo que decide el
// payout lo vuelve a calcular la base al resolver.
// ---------------------------------------------------------------------------

export function poolOf(bets: Bet[]): Pool {
  return bets.reduce<Pool>(
    (acc, b) =>
      b.side === 'YES'
        ? { yes: acc.yes + b.amount, no: acc.no }
        : { yes: acc.yes, no: acc.no + b.amount },
    { yes: 0, no: 0 },
  );
}

export function myBetIn(bets: Bet[], userId: string | null): Bet | undefined {
  return userId ? bets.find((b) => b.user_id === userId) : undefined;
}

// ---------------------------------------------------------------------------
// Un hook de carga compartido: estado de carga, error mostrable y refresco en
// segundo plano que no pisa lo que ya está en pantalla (§7). Se recarga al
// volver al foco, que es lo que hace que el saldo esté al día cuando volvés
// del detalle de una poll.
// ---------------------------------------------------------------------------

type Loadable<T> = {
  data: T;
  status: LoadStatus;
  error: string | null;
  /**
   * Sólo cuando el usuario tiró de la lista. El spinner del RefreshControl no es
   * gratis: mientras está prendido empuja el contenido hacia abajo, así que si
   * lo encendiera también la recarga de foco, cada vez que volvés a la pestaña
   * la pantalla entraría corrida y subiría sola al llegar los datos.
   */
  refreshing: boolean;
  /** Recarga callada: foco, o después de una mutación. No mueve la pantalla. */
  refresh: () => Promise<void>;
  /** La del RefreshControl: es la única que muestra el spinner. */
  pullToRefresh: () => Promise<void>;
};

function useLoadable<T>(
  empty: T,
  fetcher: (() => Promise<T>) | null,
  fallbackMessage: string,
  /** Qué se está mirando. Si cambia, lo cargado antes ya no aplica. */
  key: string | null,
): Loadable<T> {
  const [data, setData] = useState<T>(empty);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);
  // El fetcher se recrea en cada render de la pantalla; guardarlo en una ref
  // evita que `load` cambie de identidad y dispare un bucle de recargas.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (visible = false) => {
    const run = fetcherRef.current;
    if (!run) return;
    if (!loaded.current) setStatus('loading');
    else if (visible) setRefreshing(true);
    try {
      setData(await run());
      setError(null);
      setStatus('ready');
      loaded.current = true;
    } catch (e) {
      setError(dbErrorMessage(e, fallbackMessage));
      if (!loaded.current) setStatus('error');
    } finally {
      setRefreshing(false);
    }
  }, [fallbackMessage]);

  // Primera carga, y recarga entera si cambia lo que se está mirando.
  useEffect(() => {
    loaded.current = false;
    setData(empty);
    void load();
    // `empty` y `load` son estables; sólo `key` tiene que disparar esto, y si
    // entraran como deps se resetearía en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Y de nuevo al volver al foco: es lo que hace que el saldo del feed esté al
  // día cuando volvés de apostar en el detalle de una poll. En el primer foco
  // no hace nada, porque de eso ya se encargó el efecto de arriba.
  useFocusEffect(
    useCallback(() => {
      if (loaded.current) void load();
    }, [load]),
  );

  const refresh = useCallback(() => load(), [load]);
  const pullToRefresh = useCallback(() => load(true), [load]);

  return { data, status, error, refreshing, refresh, pullToRefresh };
}

// ---------------------------------------------------------------------------
// Feed del grupo: las predicciones, tu saldo y tu rol.
// ---------------------------------------------------------------------------

export type FeedData = {
  polls: PollWithBets[];
  balance: number;
  role: Role | null;
  names: NameMap;
};

const EMPTY_FEED: FeedData = { polls: [], balance: 0, role: null, names: {} };

async function fetchFeed(groupId: string, userId: string): Promise<FeedData> {
  const [pollsRes, balanceRes, memberRes] = await Promise.all([
    supabase
      .from('polls')
      .select(`${POLL_COLUMNS}, ${BET_COLUMNS}`)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false }),
    supabase.rpc('group_balance', { p_group_id: groupId }),
    supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  if (pollsRes.error) throw pollsRes.error;
  if (balanceRes.error) throw balanceRes.error;

  const polls = ((pollsRes.data ?? []) as unknown as PollWithBets[]).map((p) => ({
    ...p,
    bets: p.bets ?? [],
  }));

  return {
    polls,
    balance: typeof balanceRes.data === 'number' ? balanceRes.data : 0,
    // El rol es best-effort: quien de verdad corta el paso al panel de árbitro
    // es la RPC, no esta pantalla.
    role: ((memberRes.data as { role?: Role } | null)?.role as Role) ?? null,
    names: await fetchNames(polls.map((p) => p.creator_id)),
  };
}

export function useGroupFeed(groupId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data, ...rest } = useLoadable<FeedData>(
    EMPTY_FEED,
    groupId && userId ? () => fetchFeed(groupId, userId) : null,
    'No pudimos cargar las predicciones.',
    groupId && userId ? groupId : null,
  );

  return {
    ...rest,
    ...data,
    userId,
    isAdmin: data.role === 'owner' || data.role === 'admin',
  };
}

// ---------------------------------------------------------------------------
// Detalle de una predicción: la poll, las apuestas, el chat y tu saldo.
// ---------------------------------------------------------------------------

export type PollData = {
  poll: Poll | null;
  bets: Bet[];
  messages: Message[];
  balance: number;
  names: NameMap;
};

const EMPTY_POLL: PollData = { poll: null, bets: [], messages: [], balance: 0, names: {} };

async function fetchPoll(pollId: string): Promise<PollData> {
  const { data, error } = await supabase
    .from('polls')
    .select(`${POLL_COLUMNS}, ${BET_COLUMNS}, ${MESSAGE_COLUMNS}`)
    .eq('id', pollId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return EMPTY_POLL;

  const row = data as unknown as Poll & { bets: Bet[] | null; messages: Message[] | null };
  const bets = row.bets ?? [];
  const messages = [...(row.messages ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const { data: balance, error: balanceError } = await supabase.rpc('group_balance', {
    p_group_id: row.group_id,
  });
  if (balanceError) throw balanceError;

  return {
    poll: row as Poll,
    bets,
    messages,
    balance: typeof balance === 'number' ? balance : 0,
    names: await fetchNames([
      row.creator_id,
      row.proposed_by,
      ...row.subject_ids,
      ...bets.map((b) => b.user_id),
      ...messages.map((m) => m.user_id),
    ]),
  };
}

export function usePoll(pollId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data, ...rest } = useLoadable<PollData>(
    EMPTY_POLL,
    pollId ? () => fetchPoll(pollId) : null,
    'No pudimos cargar la predicción.',
    pollId ?? null,
  );

  return { ...rest, ...data, userId, myBet: myBetIn(data.bets, userId) };
}

// ---------------------------------------------------------------------------
// Ranking: saldos derivados del ledger, calculados por la base.
// ---------------------------------------------------------------------------

export type RankingData = { rows: RankingRow[]; names: NameMap };

const EMPTY_RANKING: RankingData = { rows: [], names: {} };

async function fetchRanking(groupId: string): Promise<RankingData> {
  const { data, error } = await supabase.rpc('group_ranking', { p_group_id: groupId });
  if (error) throw error;
  const rows = (data ?? []) as RankingRow[];
  return { rows, names: await fetchNames(rows.map((r) => r.user_id)) };
}

export function useRanking(groupId: string | undefined) {
  const { user } = useAuth();
  const { data, ...rest } = useLoadable<RankingData>(
    EMPTY_RANKING,
    groupId ? () => fetchRanking(groupId) : null,
    'No pudimos cargar el ranking.',
    groupId ?? null,
  );
  return { ...rest, ...data, userId: user?.id ?? null };
}

// ---------------------------------------------------------------------------
// Sólo el saldo. Para la pantalla que no lee ninguna otra cosa del ledger y
// que igual lo tiene que mostrar arriba a la derecha (DESIGN.md). Las que ya
// traen el dato adentro de su consulta no pasan por acá: no hace falta pedir
// dos veces el mismo número.
// ---------------------------------------------------------------------------

type BalanceData = { balance: number };

const EMPTY_BALANCE: BalanceData = { balance: 0 };

async function fetchBalance(groupId: string): Promise<BalanceData> {
  const { data, error } = await supabase.rpc('group_balance', { p_group_id: groupId });
  if (error) throw error;
  return { balance: typeof data === 'number' ? data : 0 };
}

export function useGroupBalance(groupId: string | undefined) {
  const { data, ...rest } = useLoadable<BalanceData>(
    EMPTY_BALANCE,
    groupId ? () => fetchBalance(groupId) : null,
    'No pudimos cargar tu saldo.',
    groupId ?? null,
  );
  return { ...rest, ...data };
}

// ---------------------------------------------------------------------------
// Mutaciones. Todas lanzan Error con un mensaje mostrable.
// ---------------------------------------------------------------------------

export async function createPoll(input: {
  groupId: string;
  title: string;
  description?: string;
  closesAt: Date;
  outcomeDeadline: Date;
}): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_poll', {
    p_group_id: input.groupId,
    p_title: input.title.trim(),
    p_description: input.description?.trim() || null,
    p_betting_closes_at: input.closesAt.toISOString(),
    p_outcome_deadline: input.outcomeDeadline.toISOString(),
  });
  if (error) throw new Error(dbErrorMessage(error, 'No pudimos crear la predicción.'));
  return typeof data === 'string' ? data : null;
}

export async function reviewPoll(pollId: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc('review_poll', {
    p_poll_id: pollId,
    p_approve: approve,
  });
  if (error) throw new Error(dbErrorMessage(error, 'No pudimos revisar la predicción.'));
}

/** Devuelve el saldo que queda después de apostar. */
export async function placeBet(pollId: string, side: Side, amount: number): Promise<number> {
  const { data, error } = await supabase.rpc('place_bet', {
    p_poll_id: pollId,
    p_side: side,
    p_amount: amount,
  });
  if (error) throw new Error(dbErrorMessage(error, 'No pudimos registrar la apuesta.'));
  return typeof data === 'number' ? data : 0;
}

export async function proposeOutcome(pollId: string, outcome: Side): Promise<void> {
  const { error } = await supabase.rpc('propose_outcome', {
    p_poll_id: pollId,
    p_outcome: outcome,
  });
  if (error) throw new Error(dbErrorMessage(error, 'No pudimos proponer el resultado.'));
}

export async function resolvePoll(pollId: string, outcome: Side | 'VOID'): Promise<void> {
  const { error } = await supabase.rpc('resolve_poll', {
    p_poll_id: pollId,
    p_outcome: outcome,
  });
  if (error) throw new Error(dbErrorMessage(error, 'No pudimos resolver la predicción.'));
}

export async function sendPollMessage(pollId: string, body: string): Promise<void> {
  const { error } = await supabase.rpc('send_poll_message', {
    p_poll_id: pollId,
    p_body: body.trim(),
  });
  if (error) throw new Error(dbErrorMessage(error, 'No pudimos enviar el mensaje.'));
}

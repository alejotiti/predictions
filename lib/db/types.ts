/**
 * Tipos de las entidades que viven en Supabase (§8). Son el contrato entre
 * la base y las pantallas: si la DB gana columnas, se agregan acá y no en cada
 * consulta suelta.
 *
 * Las filas llegan con snake_case porque es lo que devuelve PostgREST; no las
 * renombramos para no tener dos verdades sobre el mismo dato.
 */
import type { PollStatus } from '../domain/poll';
import type { Side } from '../domain/market';

/** Mismos roles que `group_members.role` en la base. */
export type Role = 'owner' | 'admin' | 'member';

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  created_at?: string;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string | null;
  created_by?: string | null;
  created_at?: string | null;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  role: Role;
  /**
   * Saldo INICIAL, no el saldo actual: el monto con el que arrancás, que el
   * trigger de la base convierte en el primer asiento del ledger. El saldo de
   * verdad se deriva de `transactions` (§15).
   */
  points: number;
  joined_at?: string | null;
};

/** Un grupo del usuario junto con su rol: es lo que consume "Tus grupos". */
export type GroupMembership = {
  group: Group;
  role: Role;
  /** Saldo derivado del ledger, vía la RPC `my_balances`. */
  balance: number;
  /** Best-effort: si RLS no deja contar integrantes, queda en null y no se muestra. */
  memberCount: number | null;
};

export type Poll = {
  id: string;
  group_id: string;
  creator_id: string;
  title: string;
  description: string | null;
  status: PollStatus;
  betting_closes_at: string;
  outcome_deadline: string;
  subject_ids: string[];
  proposed_outcome: Side | null;
  proposed_by: string | null;
  created_at: string;
};

/** Una fila por usuario y poll: el lado es inmutable, el monto se incrementa. */
export type Bet = {
  poll_id: string;
  user_id: string;
  side: Side;
  amount: number;
};

/** Poll con sus apuestas embebidas: es como la trae PostgREST en un solo viaje. */
export type PollWithBets = Poll & { bets: Bet[] };

export type TxType = 'INITIAL_BALANCE' | 'BET' | 'PAYOUT' | 'REFUND';

/**
 * Un movimiento del ledger. El saldo nunca se guarda: es la suma de estos
 * `amount_signed` para un grupo y un usuario.
 */
export type Transaction = {
  id: string;
  group_id: string;
  user_id: string;
  type: TxType;
  amount_signed: number;
  poll_id: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  poll_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

/** Una fila del ranking, tal como la devuelve la RPC `group_ranking`. */
export type RankingRow = {
  user_id: string;
  role: Role;
  balance: number;
};

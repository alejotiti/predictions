import type { PollStatus } from '../domain/poll';
import type { Side } from '../domain/market';

export type Role = 'owner' | 'admin' | 'member';

export type User = { id: string; username: string; displayName: string };
/** Privado: sólo se entra por código. Público: cualquiera del listado puede entrar. */
export type GroupPrivacy = 'private' | 'public';
export type Group = {
  id: string;
  name: string;
  description?: string;
  privacy: GroupPrivacy;
  inviteCode: string;
};
export type Member = { groupId: string; userId: string; role: Role };

export type Poll = {
  id: string;
  groupId: string;
  creatorId: string;
  title: string;
  description?: string;
  status: PollStatus;
  bettingClosesAt: string;
  outcomeDeadline: string;
  createdAt: string;
  subjectIds: string[];
  proposedOutcome?: 'YES' | 'NO';
  proposedBy?: string;
};

/** Una fila por usuario y poll: el lado es inmutable, el monto se incrementa. */
export type Bet = {
  pollId: string;
  userId: string;
  side: Side;
  amount: number;
};

export type Message = {
  id: string;
  pollId: string;
  userId: string;
  body: string;
  createdAt: string;
};

export type TxType =
  | 'INITIAL_BALANCE'
  | 'BET'
  | 'PAYOUT'
  | 'REFUND';

export type Transaction = {
  id: string;
  groupId: string;
  userId: string;
  type: TxType;
  amountSigned: number;
  pollId?: string;
  createdAt: string;
};

export const ME = 'u_ale';

/**
 * La app arranca vacía: todo lo que se ve se creó desde la interfaz.
 * Lo único que sobrevive acá es el usuario actual, porque el chat y el ranking
 * necesitan resolverle el nombre. Cuando entre Supabase, esto sale del auth.
 */
export const users: User[] = [
  { id: ME, username: 'ale', displayName: 'Ale' },
];

export const groups: Group[] = [];

export const members: Member[] = [];

export const polls: Poll[] = [];

export const bets: Bet[] = [];

export const messages: Message[] = [];

export const transactions: Transaction[] = [];

export const userById = (id: string) => users.find((u) => u.id === id);
export const displayName = (id: string) => userById(id)?.displayName ?? '¿?';

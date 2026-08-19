import type { PollStatus } from '../domain/poll';
import type { Side } from '../domain/market';

export type Role = 'owner' | 'admin' | 'member';

export type User = { id: string; username: string; displayName: string };
export type Group = { id: string; name: string; inviteCode: string };
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

const hours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const ME = 'u_ale';

export const users: User[] = [
  { id: 'u_ale', username: 'ale', displayName: 'Ale' },
  { id: 'u_juan', username: 'juan', displayName: 'Juan' },
  { id: 'u_alejo', username: 'alejo', displayName: 'Alejo' },
  { id: 'u_pelado', username: 'pelado', displayName: 'El Pelado' },
  { id: 'u_nico', username: 'nico', displayName: 'Nico' },
];

export const groups: Group[] = [
  { id: 'g_asado', name: 'Los del asado', inviteCode: 'ASADO7' },
  { id: 'g_facu', name: 'Facultad', inviteCode: 'FACU21' },
];

export const members: Member[] = [
  { groupId: 'g_asado', userId: 'u_ale', role: 'owner' },
  { groupId: 'g_asado', userId: 'u_juan', role: 'member' },
  { groupId: 'g_asado', userId: 'u_alejo', role: 'member' },
  { groupId: 'g_asado', userId: 'u_pelado', role: 'member' },
  { groupId: 'g_asado', userId: 'u_nico', role: 'member' },
  { groupId: 'g_facu', userId: 'u_ale', role: 'member' },
  { groupId: 'g_facu', userId: 'u_pelado', role: 'owner' },
];

export const polls: Poll[] = [
  {
    id: 'p_1',
    groupId: 'g_asado',
    creatorId: 'u_juan',
    title: 'El Pelado se saca 10 en el escrito de Análisis',
    description:
      'Vale la nota que figure en el acta. Un 9,5 redondeado no cuenta.',
    status: 'OPEN',
    bettingClosesAt: hours(20),
    outcomeDeadline: hours(72),
    createdAt: ago(30),
    subjectIds: ['u_pelado'],
  },
  {
    id: 'p_2',
    groupId: 'g_asado',
    creatorId: 'u_ale',
    title: 'Juan gana el próximo partido de paddle',
    status: 'OPEN',
    bettingClosesAt: hours(3),
    outcomeDeadline: hours(30),
    createdAt: ago(12),
    subjectIds: ['u_juan'],
  },
  {
    id: 'p_3',
    groupId: 'g_asado',
    creatorId: 'u_nico',
    title: 'Llueve el sábado en Montevideo antes de las 18',
    description: 'Según el pronóstico oficial de INUMET al cierre del día.',
    status: 'LOCKED',
    bettingClosesAt: ago(2),
    outcomeDeadline: hours(10),
    createdAt: ago(50),
    subjectIds: [],
  },
  {
    id: 'p_4',
    groupId: 'g_asado',
    creatorId: 'u_alejo',
    title: 'Nico llega antes de las 21 al asado',
    status: 'PENDING_RESULT',
    bettingClosesAt: ago(26),
    outcomeDeadline: ago(1),
    createdAt: ago(70),
    subjectIds: ['u_nico'],
    proposedOutcome: 'NO',
    proposedBy: 'u_alejo',
  },
  {
    id: 'p_5',
    groupId: 'g_asado',
    creatorId: 'u_pelado',
    title: 'Alejo llega tarde mañana',
    status: 'PENDING_APPROVAL',
    bettingClosesAt: hours(14),
    outcomeDeadline: hours(24),
    createdAt: ago(1),
    subjectIds: ['u_alejo'],
  },
  {
    id: 'p_6',
    groupId: 'g_asado',
    creatorId: 'u_juan',
    title: 'Argentina le gana a Brasil en las eliminatorias',
    status: 'RESOLVED_YES',
    bettingClosesAt: ago(100),
    outcomeDeadline: ago(90),
    createdAt: ago(200),
    subjectIds: [],
  },
];

export const bets: Bet[] = [
  { pollId: 'p_1', userId: 'u_ale', side: 'NO', amount: 150 },
  { pollId: 'p_1', userId: 'u_juan', side: 'NO', amount: 300 },
  { pollId: 'p_1', userId: 'u_alejo', side: 'YES', amount: 80 },
  { pollId: 'p_1', userId: 'u_nico', side: 'YES', amount: 40 },
  { pollId: 'p_2', userId: 'u_alejo', side: 'YES', amount: 500 },
  { pollId: 'p_2', userId: 'u_nico', side: 'NO', amount: 60 },
  { pollId: 'p_3', userId: 'u_ale', side: 'YES', amount: 200 },
  { pollId: 'p_3', userId: 'u_juan', side: 'NO', amount: 220 },
  { pollId: 'p_3', userId: 'u_pelado', side: 'NO', amount: 90 },
  { pollId: 'p_4', userId: 'u_ale', side: 'YES', amount: 100 },
  { pollId: 'p_4', userId: 'u_pelado', side: 'NO', amount: 250 },
];

export const messages: Message[] = [
  {
    id: 'm_1',
    pollId: 'p_1',
    userId: 'u_juan',
    body: 'Estudió dos horas en total, no llega ni cerca',
    createdAt: ago(20),
  },
  {
    id: 'm_2',
    pollId: 'p_1',
    userId: 'u_pelado',
    body: 'me estan faltando el respeto',
    createdAt: ago(19),
  },
  {
    id: 'm_3',
    pollId: 'p_1',
    userId: 'u_alejo',
    body: 'yo le creo, va 80 al SÍ',
    createdAt: ago(4),
  },
  {
    id: 'm_4',
    pollId: 'p_2',
    userId: 'u_nico',
    body: 'juega con la rodilla mal, ojo',
    createdAt: ago(6),
  },
];

export const transactions: Transaction[] = [
  ...members.map((m, i) => ({
    id: `t_init_${i}`,
    groupId: m.groupId,
    userId: m.userId,
    type: 'INITIAL_BALANCE' as const,
    amountSigned: 1000,
    createdAt: ago(300),
  })),
  ...bets.map((b, i) => {
    const poll = polls.find((p) => p.id === b.pollId)!;
    return {
      id: `t_bet_${i}`,
      groupId: poll.groupId,
      userId: b.userId,
      type: 'BET' as const,
      amountSigned: -b.amount,
      pollId: b.pollId,
      createdAt: ago(20),
    };
  }),
  {
    id: 't_payout_1',
    groupId: 'g_asado',
    userId: 'u_ale',
    type: 'PAYOUT',
    amountSigned: 420,
    pollId: 'p_6',
    createdAt: ago(90),
  },
  {
    id: 't_payout_2',
    groupId: 'g_asado',
    userId: 'u_nico',
    type: 'PAYOUT',
    amountSigned: 180,
    pollId: 'p_6',
    createdAt: ago(90),
  },
];

export const userById = (id: string) => users.find((u) => u.id === id);
export const displayName = (id: string) => userById(id)?.displayName ?? '¿?';

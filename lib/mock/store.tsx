/**
 * Store en memoria que imita lo que después hará Supabase.
 *
 * Regla de oro (§15): el cliente NO es autoridad sobre saldo, cierre ni payout.
 * Por eso todas las mutaciones pasan por funciones tipo "RPC" que validan las
 * mismas precondiciones que va a validar la base de datos, y el saldo siempre
 * se deriva del ledger, nunca se edita a mano. Cuando enchufemos Supabase,
 * el cuerpo de estas funciones se reemplaza por una llamada y la UI no cambia.
 */
import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import {
  bets as seedBets,
  groups as seedGroups,
  members as seedMembers,
  messages as seedMessages,
  polls as seedPolls,
  transactions as seedTx,
  ME,
  type Bet,
  type Group,
  type Member,
  type Message,
  type Poll,
  type Transaction,
} from './data';
import { distributePool, type Pool, type Side } from '../domain/market';
import { effectiveStatus } from '../domain/poll';

type State = {
  groups: Group[];
  members: Member[];
  polls: Poll[];
  bets: Bet[];
  messages: Message[];
  transactions: Transaction[];
};

const initialState: State = {
  groups: seedGroups,
  members: seedMembers,
  polls: seedPolls,
  bets: seedBets,
  messages: seedMessages,
  transactions: seedTx,
};

type Action =
  | { type: 'PLACE_BET'; pollId: string; side: Side; amount: number }
  | { type: 'CREATE_POLL'; poll: Poll }
  | { type: 'REVIEW_POLL'; pollId: string; approve: boolean }
  | { type: 'PROPOSE_OUTCOME'; pollId: string; outcome: 'YES' | 'NO' }
  | { type: 'RESOLVE_POLL'; pollId: string; outcome: 'YES' | 'NO' | 'VOID' }
  | { type: 'SEND_MESSAGE'; pollId: string; body: string }
  | { type: 'JOIN_GROUP'; inviteCode: string }
  | { type: 'CREATE_GROUP'; name: string };

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

function balanceOf(state: State, groupId: string, userId: string): number {
  return state.transactions
    .filter((t) => t.groupId === groupId && t.userId === userId)
    .reduce((acc, t) => acc + t.amountSigned, 0);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'PLACE_BET': {
      const poll = state.polls.find((p) => p.id === action.pollId);
      if (!poll) return state;
      // §4.2: el cierre se valida acá, no en la pantalla
      if (effectiveStatus(poll.status, poll.bettingClosesAt) !== 'OPEN') return state;
      if (action.amount <= 0) return state;
      if (action.amount > balanceOf(state, poll.groupId, ME)) return state;

      const existing = state.bets.find(
        (b) => b.pollId === poll.id && b.userId === ME,
      );
      // §4.2: no se puede cambiar de lado
      if (existing && existing.side !== action.side) return state;

      const nextBets = existing
        ? state.bets.map((b) =>
            b.pollId === poll.id && b.userId === ME
              ? { ...b, amount: b.amount + action.amount }
              : b,
          )
        : [...state.bets, { pollId: poll.id, userId: ME, side: action.side, amount: action.amount }];

      return {
        ...state,
        bets: nextBets,
        transactions: [
          ...state.transactions,
          {
            id: uid('t'),
            groupId: poll.groupId,
            userId: ME,
            type: 'BET',
            amountSigned: -action.amount,
            pollId: poll.id,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }

    case 'CREATE_POLL':
      return { ...state, polls: [action.poll, ...state.polls] };

    case 'REVIEW_POLL':
      return {
        ...state,
        polls: state.polls.map((p) =>
          p.id === action.pollId && p.status === 'PENDING_APPROVAL'
            ? { ...p, status: action.approve ? 'OPEN' : 'REJECTED' }
            : p,
        ),
      };

    case 'PROPOSE_OUTCOME':
      return {
        ...state,
        polls: state.polls.map((p) =>
          p.id === action.pollId
            ? { ...p, status: 'PENDING_RESULT', proposedOutcome: action.outcome, proposedBy: ME }
            : p,
        ),
      };

    case 'RESOLVE_POLL': {
      const poll = state.polls.find((p) => p.id === action.pollId);
      // §14: no resolver dos veces
      if (!poll || ['RESOLVED_YES', 'RESOLVED_NO', 'VOID'].includes(poll.status)) {
        return state;
      }
      const pollBets = state.bets.filter((b) => b.pollId === poll.id);
      const now = new Date().toISOString();
      let payouts: Transaction[] = [];

      if (action.outcome === 'VOID') {
        payouts = pollBets.map((b) => ({
          id: uid('t'),
          groupId: poll.groupId,
          userId: b.userId,
          type: 'REFUND' as const,
          amountSigned: b.amount,
          pollId: poll.id,
          createdAt: now,
        }));
      } else {
        const total = pollBets.reduce((acc, b) => acc + b.amount, 0);
        const winners = pollBets
          .filter((b) => b.side === action.outcome)
          .map((b) => ({ userId: b.userId, stake: b.amount }));
        payouts = [...distributePool(total, winners)].map(([userId, amount]) => ({
          id: uid('t'),
          groupId: poll.groupId,
          userId,
          type: 'PAYOUT' as const,
          amountSigned: amount,
          pollId: poll.id,
          createdAt: now,
        }));
      }

      return {
        ...state,
        polls: state.polls.map((p) =>
          p.id === poll.id
            ? {
                ...p,
                status:
                  action.outcome === 'VOID'
                    ? 'VOID'
                    : action.outcome === 'YES'
                      ? 'RESOLVED_YES'
                      : 'RESOLVED_NO',
              }
            : p,
        ),
        transactions: [...state.transactions, ...payouts],
      };
    }

    case 'SEND_MESSAGE':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: uid('m'),
            pollId: action.pollId,
            userId: ME,
            body: action.body,
            createdAt: new Date().toISOString(),
          },
        ],
      };

    case 'CREATE_GROUP': {
      const group: Group = {
        id: uid('g'),
        name: action.name,
        inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      };
      return {
        ...state,
        groups: [...state.groups, group],
        members: [...state.members, { groupId: group.id, userId: ME, role: 'owner' }],
        transactions: [
          ...state.transactions,
          {
            id: uid('t'),
            groupId: group.id,
            userId: ME,
            type: 'INITIAL_BALANCE',
            amountSigned: 1000,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }

    case 'JOIN_GROUP': {
      const group = state.groups.find(
        (g) => g.inviteCode.toUpperCase() === action.inviteCode.trim().toUpperCase(),
      );
      if (!group) return state;
      if (state.members.some((m) => m.groupId === group.id && m.userId === ME)) return state;
      return {
        ...state,
        members: [...state.members, { groupId: group.id, userId: ME, role: 'member' }],
        transactions: [
          ...state.transactions,
          {
            id: uid('t'),
            groupId: group.id,
            userId: ME,
            type: 'INITIAL_BALANCE',
            amountSigned: 1000,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }

    default:
      return state;
  }
}

type Api = {
  state: State;
  me: string;
  dispatch: React.Dispatch<Action>;
  balance: (groupId: string, userId?: string) => number;
  roleIn: (groupId: string, userId?: string) => Member['role'] | undefined;
  isAdmin: (groupId: string, userId?: string) => boolean;
  groupsOf: (userId?: string) => Group[];
  membersOf: (groupId: string) => Member[];
  pollsOf: (groupId: string) => Poll[];
  poolOf: (pollId: string) => Pool;
  myBet: (pollId: string) => Bet | undefined;
  betsOf: (pollId: string) => Bet[];
  messagesOf: (pollId: string) => Message[];
};

const Ctx = createContext<Api | null>(null);

export function MockStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const api = useMemo<Api>(() => {
    const balance = (groupId: string, userId = ME) => balanceOf(state, groupId, userId);
    const roleIn = (groupId: string, userId = ME) =>
      state.members.find((m) => m.groupId === groupId && m.userId === userId)?.role;
    return {
      state,
      me: ME,
      dispatch,
      balance,
      roleIn,
      isAdmin: (groupId, userId = ME) => {
        const r = roleIn(groupId, userId);
        return r === 'owner' || r === 'admin';
      },
      groupsOf: (userId = ME) =>
        state.groups.filter((g) =>
          state.members.some((m) => m.groupId === g.id && m.userId === userId),
        ),
      membersOf: (groupId) => state.members.filter((m) => m.groupId === groupId),
      pollsOf: (groupId) => state.polls.filter((p) => p.groupId === groupId),
      poolOf: (pollId) =>
        state.bets
          .filter((b) => b.pollId === pollId)
          .reduce<Pool>(
            (acc, b) =>
              b.side === 'YES'
                ? { yes: acc.yes + b.amount, no: acc.no }
                : { yes: acc.yes, no: acc.no + b.amount },
            { yes: 0, no: 0 },
          ),
      myBet: (pollId) => state.bets.find((b) => b.pollId === pollId && b.userId === ME),
      betsOf: (pollId) => state.bets.filter((b) => b.pollId === pollId),
      messagesOf: (pollId) =>
        state.messages
          .filter((m) => m.pollId === pollId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
  }, [state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): Api {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore fuera de MockStoreProvider');
  return ctx;
}

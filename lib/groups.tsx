/**
 * Grupos reales del usuario (§3, §4, §5).
 *
 * Vive como provider y no como hook suelto por pantalla para que crear o
 * unirse pueda refrescar la lista antes de volver: cuando "Tus grupos" se
 * vuelve a montar, el grupo nuevo ya está en memoria y no hay parpadeo.
 *
 * Las mutaciones pasan sí o sí por las RPC: la base decide owner, invite_code y
 * membresía a partir de auth.uid(), el cliente no manda nada de eso (§9).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from './supabase';
import { dbErrorMessage } from './errors';
import { useAuth } from './auth';
import type { Group, GroupMembership, Role } from './db/types';

export type GroupsStatus = 'loading' | 'ready' | 'error';

type GroupsApi = {
  status: GroupsStatus;
  groups: GroupMembership[];
  error: string | null;
  /**
   * Sólo cuando el usuario tiró de la lista. El spinner del RefreshControl
   * empuja el contenido mientras está prendido, así que una recarga de fondo no
   * puede encenderlo: la pantalla entraría corrida y subiría sola al terminar.
   */
  refreshing: boolean;
  /** Recarga callada, sin tapar ni mover la lista que ya se está mostrando. */
  refresh: () => Promise<void>;
  /** La del RefreshControl: es la única que muestra el spinner. */
  pullToRefresh: () => Promise<void>;
  /** Devuelve el id del grupo creado. Lanza Error con un mensaje mostrable. */
  createGroup: (input: { name: string; description?: string }) => Promise<string | null>;
  /** Devuelve el id del grupo al que se entró. Lanza Error si el código no sirve. */
  joinGroupByCode: (inviteCode: string) => Promise<string | null>;
  /**
   * Salir de un grupo. Si era el último adentro, la base borra el grupo y
   * libera su código. Lanza Error con un mensaje mostrable.
   */
  leaveGroup: (groupId: string) => Promise<void>;
};

/** Lo que devuelve el select de abajo: PostgREST anida el grupo dentro de la membresía. */
type MembershipRow = { role: Role; group: Group | Group[] | null };

const Ctx = createContext<GroupsApi | null>(null);

/**
 * El grupo que se está mirando, bajado desde el layout de `group/[groupId]`.
 *
 * Adentro de las pestañas no se puede leer del router: a una pestaña se entra
 * con un tab press, que navega sin params, y `useLocalSearchParams` devuelve
 * vacío porque el `[groupId]` es de la ruta del layout, no de la pestaña.
 * `useGlobalSearchParams` tampoco sirve: al empujar `/poll/[pollId]` el feed
 * sigue montado y se quedaría sin groupId a mitad de camino. Se lee una vez
 * arriba, donde el param es de la ruta, y de ahí no se mueve.
 */
const GroupIdCtx = createContext<string | undefined>(undefined);

export const GroupIdProvider = GroupIdCtx.Provider;

export function useGroupId(): string | undefined {
  return useContext(GroupIdCtx);
}

/** Las RPC pueden devolver el uuid pelado, la fila entera o un set de una fila. */
function groupIdFrom(data: unknown): string | null {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return groupIdFrom(data[0]);
  if (data && typeof data === 'object') {
    const id = (data as { id?: unknown; group_id?: unknown }).id ?? (data as { group_id?: unknown }).group_id;
    if (typeof id === 'string') return id;
  }
  return null;
}

async function fetchMemberships(userId: string): Promise<GroupMembership[]> {
  // El filtro por user_id es sólo eso, un filtro: quien de verdad acota las
  // filas visibles es RLS con auth.uid() (§9).
  const { data, error } = await supabase
    .from('group_members')
    .select('role, group:groups(*)')
    .eq('user_id', userId);
  if (error) throw error;

  const memberships = ((data ?? []) as unknown as MembershipRow[])
    .map((row) => {
      const group = Array.isArray(row.group) ? row.group[0] : row.group;
      return group
        ? { group, role: row.role, balance: 0, memberCount: null as number | null }
        : null;
    })
    .filter((m): m is GroupMembership => m !== null)
    .sort((a, b) => {
      const byDate = (b.group.created_at ?? '').localeCompare(a.group.created_at ?? '');
      return byDate !== 0 ? byDate : a.group.name.localeCompare(b.group.name);
    });

  if (memberships.length === 0) return memberships;

  // El saldo sale del ledger, nunca de una columna (§15). Acá no hay
  // best-effort: si no lo podemos calcular preferimos el estado de error antes
  // que mostrar un cero que parece un saldo de verdad.
  const { data: balanceRows, error: balanceError } = await supabase.rpc('my_balances');
  if (balanceError) throw balanceError;

  const balances = new Map<string, number>(
    ((balanceRows ?? []) as { group_id: string; balance: number }[]).map((r) => [
      r.group_id,
      r.balance,
    ]),
  );

  // Cantidad de integrantes: si RLS no deja ver a los demás miembros, la lista
  // se muestra igual sin ese dato en vez de fallar entera.
  const { data: rows, error: countError } = await supabase
    .from('group_members')
    .select('group_id')
    .in(
      'group_id',
      memberships.map((m) => m.group.id),
    );

  const counts = new Map<string, number>();
  if (!countError && rows) {
    for (const row of rows as { group_id: string }[]) {
      counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
    }
  }

  return memberships.map((m) => ({
    ...m,
    balance: balances.get(m.group.id) ?? 0,
    memberCount: counts.get(m.group.id) ?? null,
  }));
}

export function GroupsProvider({ children }: { children: ReactNode }) {
  const { user, status: authStatus } = useAuth();
  const userId = user?.id ?? null;

  const [groups, setGroups] = useState<GroupMembership[]>([]);
  const [status, setStatus] = useState<GroupsStatus>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);
  /** Espejo de `groups` para poder leerlo dentro de las mutaciones sin closure viejo. */
  const current = useRef<GroupMembership[]>([]);

  /** Devuelve la lista recién traída para poder compararla contra la anterior. */
  const load = useCallback(async (visible = false): Promise<GroupMembership[]> => {
    if (!userId) return [];
    // La primera carga muestra el skeleton; las siguientes no pisan la lista (§7).
    if (!loaded.current) setStatus('loading');
    else if (visible) setRefreshing(true);
    try {
      const next = await fetchMemberships(userId);
      setGroups(next);
      current.current = next;
      setError(null);
      setStatus('ready');
      loaded.current = true;
      return next;
    } catch (e) {
      setError(dbErrorMessage(e, 'No pudimos cargar tus grupos.'));
      if (!loaded.current) setStatus('error');
      return current.current;
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loaded.current = false;
    current.current = [];
    setGroups([]);
    setError(null);
    if (!userId) {
      // Sin sesión no hay nada que pedir; tampoco dejamos datos del anterior.
      setStatus(authStatus === 'loading' ? 'loading' : 'ready');
      return;
    }
    setStatus('loading');
    void load();
  }, [userId, authStatus, load]);

  const api = useMemo<GroupsApi>(
    () => ({
      status,
      groups,
      error,
      refreshing,
      async refresh() {
        await load();
      },
      async pullToRefresh() {
        await load(true);
      },
      async createGroup({ name, description }) {
        const { data, error: rpcError } = await supabase.rpc('create_group', {
          p_name: name.trim(),
          p_description: description?.trim() || null,
        });
        if (rpcError) throw new Error(dbErrorMessage(rpcError, 'No pudimos crear el grupo.'));
        await load();
        return groupIdFrom(data);
      },
      async joinGroupByCode(inviteCode) {
        const before = new Set(current.current.map((m) => m.group.id));
        const { data, error: rpcError } = await supabase.rpc('join_group_by_code', {
          p_invite_code: inviteCode.trim(),
        });
        if (rpcError) {
          throw new Error(
            dbErrorMessage(rpcError, 'No encontramos ningún grupo con ese código.'),
          );
        }
        // No sabemos si la RPC devuelve el id, la fila o nada: la prueba de que
        // funcionó es que ahora exista una membresía que antes no estaba.
        const after = await load();
        const id = groupIdFrom(data) ?? after.find((m) => !before.has(m.group.id))?.group.id ?? null;
        if (!id && data !== true) {
          throw new Error('No encontramos ningún grupo con ese código.');
        }
        return id;
      },
      async leaveGroup(groupId) {
        const { error: rpcError } = await supabase.rpc('leave_group', {
          p_group_id: groupId,
        });
        if (rpcError) {
          throw new Error(dbErrorMessage(rpcError, 'No pudimos sacarte del grupo.'));
        }
        // La fila se saca de la lista antes de recargar: la salida ya está
        // hecha en la base y esperar el viaje de vuelta dejaría el grupo un
        // rato más en pantalla, justo después de confirmar que se va.
        const next = current.current.filter((m) => m.group.id !== groupId);
        current.current = next;
        setGroups(next);
        await load();
      },
    }),
    [status, groups, error, refreshing, load],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useGroups(): GroupsApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGroups fuera de GroupsProvider');
  return ctx;
}

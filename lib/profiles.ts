/**
 * Nombres para mostrar.
 *
 * Es best-effort a propósito: si RLS no deja leer `profiles`, la pantalla se
 * dibuja igual con un fallback en vez de fallar entera. Un ranking sin nombres
 * sigue siendo útil; un ranking que no carga, no.
 */
import { supabase } from './supabase';
import type { Profile } from './db/types';

export type NameMap = Record<string, string>;

export async function fetchNames(userIds: (string | null | undefined)[]): Promise<NameMap> {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))];
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', ids);
  if (error || !data) return {};

  const names: NameMap = {};
  for (const profile of data as Profile[]) {
    const name = profile.display_name?.trim() || profile.username?.trim();
    if (name) names[profile.id] = name;
  }
  return names;
}

/** Sin nombre mostramos un trozo del id, que al menos distingue a dos personas. */
export function nameOf(names: NameMap, userId: string): string {
  return names[userId] ?? `#${userId.slice(0, 4)}`;
}

-- Arregla: 42P17 "infinite recursion detected in policy for relation group_members".
--
-- La recursión pasa cuando la policy de SELECT de `group_members` pregunta por
-- `group_members` para saber si sos miembro: evaluar la policy dispara la misma
-- policy. Lo mismo vale para una policy de `groups` que consulte `group_members`,
-- porque esa consulta arrastra el RLS de la otra tabla.
--
-- La salida es encapsular la pregunta en una función `security definer`, que corre
-- con los permisos del dueño de la tabla y por lo tanto sin RLS.
--
-- Correr en el SQL Editor de Supabase. Es idempotente.

-- ---------------------------------------------------------------------------
-- 1. Mirá qué policies hay hoy. Las que aparezcan acá son las que el paso 3 borra.
--    Si alguna tiene cmd distinto de SELECT (ALL, INSERT, UPDATE), anotala: al
--    borrarla también perdés esa regla de escritura y hay que rehacerla aparte.
-- ---------------------------------------------------------------------------

select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('groups', 'group_members')
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- 2. La función que corta el ciclo.
-- ---------------------------------------------------------------------------

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_group_member(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Borra las policies recursivas sin depender de cómo se llamen: se van sólo
--    las que mencionan `group_members` en su definición, que son exactamente las
--    que producen el ciclo. Las dos nuevas de abajo quedan excluidas.
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('groups', 'group_members')
      and policyname not in ('groups_select', 'group_members_select')
      and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~* '\mgroup_members\M'
  loop
    raise notice 'borrando policy % en %', r.policyname, r.tablename;
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Las policies buenas. Ya no recursan porque preguntan por la función.
-- ---------------------------------------------------------------------------

drop policy if exists "group_members_select" on public.group_members;
drop policy if exists "groups_select" on public.groups;

-- Cada uno ve sus propias membresías y las de sus compañeros de grupo.
create policy "group_members_select"
  on public.group_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_member(group_id)
  );

-- Un grupo se ve si sos miembro. Sin esto no se puede listar "Tus grupos".
create policy "groups_select"
  on public.groups
  for select
  to authenticated
  using (public.is_group_member(id));

-- ---------------------------------------------------------------------------
-- 5. Control: esto tiene que devolver las dos policies nuevas y ninguna otra
--    que mencione group_members.
-- ---------------------------------------------------------------------------

select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('groups', 'group_members')
order by tablename, policyname;

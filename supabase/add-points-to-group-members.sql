-- Agrega `group_members.points` y define con cuántos puntos entra alguien nuevo:
--
--   * si el grupo ya tiene miembros -> los mismos puntos que el que menos tiene,
--     así nadie gana ventaja entrando tarde;
--   * si el grupo está vacío (sos el que lo creó) -> 300.
--
-- La regla vive en un trigger y no en las RPC `create_group` / `join_group_by_code`
-- porque es una invariante de la tabla: vale para cualquier insert, venga de donde
-- venga, y no hay que acordarse de repetirla si mañana aparece otra forma de entrar.
--
-- Correr en el SQL Editor de Supabase. Es idempotente.

-- ---------------------------------------------------------------------------
-- 1. La columna. Nace nullable a propósito: `null` es la señal de "decidilo vos"
--    que lee el trigger. Un default de 300 no serviría, porque después no habría
--    forma de distinguir "no me lo mandaron" de "me mandaron 300".
-- ---------------------------------------------------------------------------

alter table public.group_members
  add column if not exists points integer;

-- Los que ya estaban adentro arrancan todos parejos.
update public.group_members
   set points = 300
 where points is null;

-- ---------------------------------------------------------------------------
-- 2. La regla de entrada.
--
--    `security definer` no es opcional: el trigger corre dentro del insert del
--    que se está uniendo, que todavía no es miembro, así que con el RLS de
--    `group_members` no vería a ninguno de los otros y el min() daría null.
--    Correría siempre por la rama de los 300.
-- ---------------------------------------------------------------------------

create or replace function public.group_members_initial_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min integer;
begin
  -- Si el insert trae un valor explícito, mandá vos. El trigger sólo completa.
  if new.points is not null then
    return new;
  end if;

  select min(gm.points)
    into v_min
    from public.group_members gm
   where gm.group_id = new.group_id;

  -- min() sobre cero filas devuelve null: ese es exactamente el caso del creador.
  -- (Si algún día el saldo puede quedar negativo y no querés que el nuevo herede
  --  el rojo, acá va un greatest(v_min, 0).)
  new.points := coalesce(v_min, 300);
  return new;
end;
$$;

revoke all on function public.group_members_initial_points() from public;

drop trigger if exists group_members_initial_points on public.group_members;

create trigger group_members_initial_points
  before insert on public.group_members
  for each row
  execute function public.group_members_initial_points();

-- ---------------------------------------------------------------------------
-- 3. Recién ahora el not null: antes había filas viejas en null y el paso 1 las
--    llenó, y de acá en adelante el trigger garantiza que nunca entre una nueva
--    en null (los BEFORE triggers corren antes de que se chequeen constraints).
-- ---------------------------------------------------------------------------

alter table public.group_members
  alter column points set not null;

-- ---------------------------------------------------------------------------
-- 4. OPCIONAL pero recomendado: que el cliente no pueda editarse los puntos.
--    Supabase le da UPDATE sobre toda la tabla a `authenticated` y lo único que
--    lo frena es RLS; si hay una policy de update sobre la propia fila, cualquiera
--    se pone los puntos que quiera desde la app. Un revoke a nivel columna no
--    alcanza: el permiso a nivel tabla le gana. Hay que sacar el de tabla y
--    devolver sólo las columnas que sí se tocan.
--
--    Está comentado porque si tenés otro flujo que escribe otras columnas
--    (por ejemplo cambiar el rol desde admin) tenés que agregarlas a la lista.
-- ---------------------------------------------------------------------------

-- revoke update on public.group_members from authenticated;
-- grant update (role) on public.group_members to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Control.
-- ---------------------------------------------------------------------------

select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'group_members'
   and column_name = 'points';

select g.name, p.username, gm.role, gm.points
  from public.group_members gm
  join public.groups g on g.id = gm.group_id
  left join public.profiles p on p.id = gm.user_id
 order by g.name, gm.points, gm.joined_at;

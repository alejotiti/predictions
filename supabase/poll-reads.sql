-- Mensajes sin leer: el puntito de la tarjeta del feed.
--
-- "Quién vio qué" es estado por usuario y por predicción, y no se puede derivar
-- de `messages`: esa tabla guarda quién escribió, no quién leyó. Por eso hay
-- tabla nueva. Es la misma idea que el ledger —una fila por hecho, nada de un
-- booleano editable—, sólo que acá alcanza con una marca de tiempo por persona:
-- todo mensaje anterior a tu `last_seen_at` está visto, todo el posterior no.
-- Guardar una fila por mensaje y por miembro sería el doble de escrituras para
-- responder exactamente la misma pregunta.
--
-- Los mensajes propios nunca cuentan: el que escribe ya lo vio.
--
-- Requiere haber corrido antes `fix-rls-recursion.sql` y `ledger.sql`. Correr en
-- el SQL Editor de Supabase. Es idempotente.

-- ===========================================================================
-- 1. La tabla
-- ===========================================================================

create table if not exists public.poll_reads (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

-- ===========================================================================
-- 2. Marcar como visto
-- ===========================================================================

-- El `greatest` no es decorativo: dos pantallas abiertas a la vez pueden llamar
-- esto desordenado, y sin él la llamada que llega tarde con una hora vieja
-- haría reaparecer mensajes ya vistos.
--
-- Se marca con `now()` del servidor y no con el último mensaje que vio el
-- cliente: la hora la pone la base en todo el resto del esquema y acá no hay
-- razón para confiar en el reloj del teléfono. La contra es una ventana de
-- milisegundos —un mensaje que entra entre la consulta de la pantalla y esta
-- llamada queda marcado como visto sin haberse pintado—, y para un punto de
-- aviso eso es más barato que arrastrar un timestamp del cliente.
create or replace function public.mark_poll_read(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_group uuid;
begin
  if v_uid is null then
    raise exception 'No hay sesión iniciada.';
  end if;

  select group_id into v_group from public.polls where id = p_poll_id;
  if not found then
    raise exception 'La predicción no existe.';
  end if;
  if not public.is_group_member(v_group) then
    raise exception 'No sos parte de este grupo.';
  end if;

  insert into public.poll_reads (poll_id, user_id, last_seen_at)
  values (p_poll_id, v_uid, now())
  on conflict (poll_id, user_id) do update
    set last_seen_at = greatest(poll_reads.last_seen_at, excluded.last_seen_at);
end;
$fn$;

-- ===========================================================================
-- 3. Cuántos sin leer tiene cada predicción del grupo
-- ===========================================================================

-- Una sola llamada para todo el feed: la pantalla ya trae las polls con sus
-- apuestas embebidas en un viaje, y esto es el segundo y último.
--
-- Devuelve sólo las polls que tienen algo sin leer. Las que no aparecen es
-- porque no tienen nada, así que el cliente no necesita distinguir "cero" de
-- "no vino en la respuesta".
create or replace function public.group_unread(p_group_id uuid)
returns table (poll_id uuid, unread integer)
language sql
security definer
set search_path = public
stable
as $fn$
  select m.poll_id, count(*)::integer
  from public.messages m
  join public.polls p on p.id = m.poll_id
  left join public.poll_reads r
    on r.poll_id = m.poll_id
   and r.user_id = auth.uid()
  where p.group_id = p_group_id
    and public.is_group_member(p_group_id)
    -- Sin fila en `poll_reads` nunca abriste esa predicción: todo lo ajeno
    -- cuenta. `-infinity` es lo que hace que ese caso no necesite una rama.
    and m.user_id <> auth.uid()
    and m.created_at > coalesce(r.last_seen_at, '-infinity'::timestamptz)
  group by m.poll_id;
$fn$;

-- ===========================================================================
-- 4. Permisos
-- ===========================================================================

revoke all on function public.mark_poll_read(uuid) from public;
revoke all on function public.group_unread(uuid) from public;

grant execute on function public.mark_poll_read(uuid) to authenticated;
grant execute on function public.group_unread(uuid) to authenticated;

alter table public.poll_reads enable row level security;

-- Sin policies a propósito: `poll_reads` no se lee ni se escribe nunca desde el
-- cliente. Lo que se escribe pasa por `mark_poll_read` y lo que se lee sale
-- contado por `group_unread`; las dos son security definer. Con RLS prendida y
-- ninguna policy, cualquier consulta directa desde la app no ve nada, que es
-- exactamente lo que queremos.
revoke all on public.poll_reads from anon, authenticated;

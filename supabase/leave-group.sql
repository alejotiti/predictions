-- Salir de un grupo, y que el grupo desaparezca cuando se queda sin nadie.
--
-- La regla que pidió el producto: si el que se va era el último, el grupo se
-- borra para siempre y su `invite_code` vuelve a estar disponible. Como el
-- código es una columna del grupo, borrar la fila es exactamente lo que lo
-- libera: no hay una tabla de códigos aparte que haya que limpiar.
--
-- Lo que NO se borra es el ledger de los que se fueron mientras el grupo sigue
-- vivo. `transactions` cuelga del grupo y del usuario, no de la membresía, así
-- que el que sale y vuelve a entrar recupera su saldo: el índice único
-- `transactions_one_initial_per_member` ya impedía que cobrara los 300 de nuevo,
-- y esto es la otra mitad de esa misma idea. Cuando el grupo se borra, en cambio,
-- se van todas sus filas por el `on delete cascade` de `ledger.sql`.
--
-- Requiere haber corrido antes `ledger.sql`. Correr en el SQL Editor de
-- Supabase. Es idempotente.

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_left integer;
begin
  if v_uid is null then
    raise exception 'No hay sesión iniciada.';
  end if;

  -- El lock sobre el grupo serializa dos salidas a la vez. Sin él los dos
  -- últimos podrían contar al mismo tiempo, verse uno al otro todavía adentro,
  -- y quedar un grupo vacío que ya no puede borrar nadie.
  perform 1 from public.groups where id = p_group_id for update;
  if not found then
    raise exception 'Este grupo ya no existe.';
  end if;

  delete from public.group_members
   where group_id = p_group_id
     and user_id = v_uid
  returning role::text into v_role;

  if v_role is null then
    raise exception 'No sos parte de este grupo.';
  end if;

  select count(*) into v_left
    from public.group_members
   where group_id = p_group_id;

  -- Sin nadie adentro el grupo no vuelve. Polls, apuestas, ledger y mensajes se
  -- van solos con el cascade, y el código queda libre para otro grupo.
  if v_left = 0 then
    delete from public.groups where id = p_group_id;
    return;
  end if;

  -- Un grupo con gente adentro no puede quedarse sin árbitro: sin él nadie
  -- aprueba ni resuelve nada y las predicciones quedan colgadas para siempre.
  -- Si el que se fue era el último, hereda el más antiguo de los que quedan.
  if v_role in ('owner', 'admin')
     and not exists (
       select 1 from public.group_members
        where group_id = p_group_id
          and role::text in ('owner', 'admin')
     )
  then
    update public.group_members
       set role = 'owner'
     where group_id = p_group_id
       and user_id = (
         select user_id
           from public.group_members
          where group_id = p_group_id
          order by joined_at nulls last, user_id
          limit 1
       );
  end if;
end;
$fn$;

revoke all on function public.leave_group(uuid) from public;
grant execute on function public.leave_group(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Control: la función tiene que estar y ser security definer.
-- ---------------------------------------------------------------------------

select p.proname, p.prosecdef as security_definer
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname = 'leave_group';

-- Ledger, polls, apuestas y chat en Supabase.
--
-- La idea de fondo (§10, §15): el saldo NO es una columna. Es la suma de los
-- movimientos de `transactions`. Nadie escribe un saldo nunca: entrar a un grupo
-- inserta un INITIAL_BALANCE, apostar inserta un BET negativo, resolver inserta
-- los PAYOUT, anular inserta los REFUND. Si un reparto sale mal, se borran esas
-- filas y el saldo se corrige solo, porque nunca fue un dato guardado.
--
-- `group_members.points` deja de ser "el saldo" y pasa a ser el saldo INICIAL:
-- el monto con el que arrancás, que el trigger convierte en el primer asiento.
--
-- Toda escritura pasa por RPC `security definer`. Las tablas tienen RLS con
-- policies sólo de SELECT y el INSERT/UPDATE/DELETE directo está revocado: el
-- cliente puede leer, no puede mover un punto por su cuenta.
--
-- Requiere haber corrido antes `fix-rls-recursion.sql` (usa `is_group_member`)
-- y `add-points-to-group-members.sql` (usa `group_members.points`).
-- Correr en el SQL Editor de Supabase. Es idempotente.

-- ===========================================================================
-- 1. Helpers de permiso
-- ===========================================================================

-- Árbitro del grupo. Es un rol, nunca un user_id fijo (§15).
create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $fn$
  select exists (
    select 1 from public.group_members
     where group_id = p_group_id
       and user_id = auth.uid()
       and role::text in ('owner', 'admin')
  );
$fn$;

revoke all on function public.is_group_admin(uuid) from public;
grant execute on function public.is_group_admin(uuid) to authenticated;

-- ===========================================================================
-- 2. Tablas
-- ===========================================================================

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) > 3),
  description text,
  status text not null default 'PENDING_APPROVAL'
    check (status in ('PENDING_APPROVAL','REJECTED','OPEN','LOCKED',
                      'PENDING_RESULT','RESOLVED_YES','RESOLVED_NO','VOID')),
  betting_closes_at timestamptz not null,
  outcome_deadline timestamptz not null,
  subject_ids uuid[] not null default '{}',
  proposed_outcome text check (proposed_outcome in ('YES','NO')),
  proposed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists polls_group_created_idx
  on public.polls (group_id, created_at desc);

-- Una fila por usuario y poll: el lado es inmutable, el monto se incrementa (§4.2).
-- Eso lo garantiza la PK, no la pantalla.
create table if not exists public.bets (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  side text not null check (side in ('YES','NO')),
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

-- El ledger. Append-only: no hay policy de update ni de delete, a propósito.
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('INITIAL_BALANCE','BET','PAYOUT','REFUND')),
  amount_signed integer not null,
  poll_id uuid references public.polls(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists transactions_balance_idx
  on public.transactions (group_id, user_id);

-- Un solo saldo inicial por miembro: si alguien sale y vuelve a entrar, no
-- cobra 300 de nuevo.
create unique index if not exists transactions_one_initial_per_member
  on public.transactions (group_id, user_id)
  where type = 'INITIAL_BALANCE';

-- Una sola liquidación por usuario y poll. Esto es lo que hace que resolver dos
-- veces sea imposible aunque dos árbitros toquen el botón al mismo tiempo.
create unique index if not exists transactions_one_settlement_per_poll
  on public.transactions (poll_id, user_id, type)
  where type in ('PAYOUT','REFUND');

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists messages_poll_idx
  on public.messages (poll_id, created_at);

-- ===========================================================================
-- 3. Saldo derivado
-- ===========================================================================

-- El guard `is_group_member` no es decorativo: la función es security definer,
-- así que sin él cualquiera consultaría el saldo de cualquier grupo.
create or replace function public.group_balance(
  p_group_id uuid,
  p_user_id uuid default auth.uid()
)
returns integer
language sql
security definer
set search_path = public
stable
as $fn$
  select case
    when public.is_group_member(p_group_id) then
      coalesce((select sum(t.amount_signed)
                  from public.transactions t
                 where t.group_id = p_group_id
                   and t.user_id = p_user_id), 0)::integer
    else null
  end;
$fn$;

-- Saldo del usuario en todos sus grupos, para la lista "Tus grupos".
create or replace function public.my_balances()
returns table (group_id uuid, balance integer)
language sql
security definer
set search_path = public
stable
as $fn$
  select gm.group_id,
         coalesce((select sum(t.amount_signed)
                     from public.transactions t
                    where t.group_id = gm.group_id
                      and t.user_id = gm.user_id), 0)::integer
    from public.group_members gm
   where gm.user_id = auth.uid();
$fn$;

-- Ranking del grupo: saldo de cada miembro, siempre derivado.
create or replace function public.group_ranking(p_group_id uuid)
returns table (user_id uuid, role text, balance integer)
language sql
security definer
set search_path = public
stable
as $fn$
  select gm.user_id,
         gm.role::text,
         coalesce((select sum(t.amount_signed)
                     from public.transactions t
                    where t.group_id = gm.group_id
                      and t.user_id = gm.user_id), 0)::integer
    from public.group_members gm
   where gm.group_id = p_group_id
     and public.is_group_member(p_group_id)
   order by 3 desc, gm.joined_at;
$fn$;

revoke all on function public.group_balance(uuid, uuid) from public;
revoke all on function public.my_balances() from public;
revoke all on function public.group_ranking(uuid) from public;
grant execute on function public.group_balance(uuid, uuid) to authenticated;
grant execute on function public.my_balances() to authenticated;
grant execute on function public.group_ranking(uuid) to authenticated;

-- ===========================================================================
-- 4. El saldo inicial entra como asiento, no como columna
-- ===========================================================================

create or replace function public.group_members_seed_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.transactions (group_id, user_id, type, amount_signed)
  values (new.group_id, new.user_id, 'INITIAL_BALANCE', new.points)
  on conflict do nothing;
  return new;
end;
$fn$;

drop trigger if exists group_members_seed_ledger on public.group_members;

create trigger group_members_seed_ledger
  after insert on public.group_members
  for each row
  execute function public.group_members_seed_ledger();

-- Los que ya estaban adentro antes de que existiera el ledger.
insert into public.transactions (group_id, user_id, type, amount_signed)
select gm.group_id, gm.user_id, 'INITIAL_BALANCE', gm.points
  from public.group_members gm
on conflict do nothing;

-- ===========================================================================
-- 5. RPCs de escritura
--
--    Son la única puerta. Cada una revalida sus precondiciones acá adentro,
--    aunque la pantalla ya las haya chequeado: el cliente no es autoridad.
-- ===========================================================================

-- --- crear una predicción ---------------------------------------------------
-- Nace PENDING_APPROVAL siempre, incluso si la crea el árbitro: la aprobación
-- es un paso del flujo, no un permiso.
create or replace function public.create_poll(
  p_group_id uuid,
  p_title text,
  p_description text,
  p_betting_closes_at timestamptz,
  p_outcome_deadline timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'No hay sesión iniciada.';
  end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'No sos parte de este grupo.';
  end if;
  if length(btrim(coalesce(p_title, ''))) <= 3 then
    raise exception 'La predicción necesita un título.';
  end if;
  if p_betting_closes_at <= now() then
    raise exception 'El cierre tiene que ser más adelante que ahora.';
  end if;
  if p_outcome_deadline < p_betting_closes_at then
    raise exception 'El plazo del resultado no puede ser antes del cierre.';
  end if;

  insert into public.polls (
    group_id, creator_id, title, description,
    betting_closes_at, outcome_deadline
  )
  values (
    p_group_id, v_uid, btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''),
    p_betting_closes_at, p_outcome_deadline
  )
  returning id into v_id;

  return v_id;
end;
$fn$;

-- --- aprobar o rechazar -----------------------------------------------------
create or replace function public.review_poll(p_poll_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_poll public.polls;
begin
  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found then
    raise exception 'La predicción no existe.';
  end if;
  if not public.is_group_admin(v_poll.group_id) then
    raise exception 'Sólo el árbitro puede aprobar o rechazar.';
  end if;
  if v_poll.status <> 'PENDING_APPROVAL' then
    raise exception 'Esta predicción ya fue revisada.';
  end if;

  update public.polls
     set status = case when p_approve then 'OPEN' else 'REJECTED' end
   where id = p_poll_id;
end;
$fn$;

-- --- apostar ----------------------------------------------------------------
-- El corazón del asunto. Devuelve el saldo nuevo.
create or replace function public.place_bet(
  p_poll_id uuid,
  p_side text,
  p_amount integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_poll public.polls;
  v_existing public.bets;
  v_balance integer;
begin
  if v_uid is null then
    raise exception 'No hay sesión iniciada.';
  end if;
  if p_side not in ('YES','NO') then
    raise exception 'Lado inválido.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto tiene que ser mayor a cero.';
  end if;

  -- Bloquea la poll para que no se resuelva justo mientras entra esta apuesta.
  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found then
    raise exception 'La predicción no existe.';
  end if;

  -- Bloquear la membresía es lo que serializa el saldo: sin esto, dos apuestas
  -- simultáneas del mismo usuario leen el mismo saldo y las dos pasan el
  -- chequeo, y termina apostando más puntos de los que tiene.
  perform 1 from public.group_members
   where group_id = v_poll.group_id and user_id = v_uid
   for update;
  if not found then
    raise exception 'No sos parte de este grupo.';
  end if;

  if v_poll.status <> 'OPEN' or v_poll.betting_closes_at <= now() then
    raise exception 'Las apuestas están cerradas.';
  end if;

  select * into v_existing from public.bets
   where poll_id = p_poll_id and user_id = v_uid;
  if found and v_existing.side <> p_side then
    raise exception 'Ya estás del otro lado: podés sumar puntos, no cambiar de lado.';
  end if;

  select coalesce(sum(t.amount_signed), 0) into v_balance
    from public.transactions t
   where t.group_id = v_poll.group_id and t.user_id = v_uid;

  if p_amount > v_balance then
    raise exception 'No te alcanzan los puntos: tenés %.', v_balance;
  end if;

  insert into public.bets (poll_id, user_id, side, amount)
  values (p_poll_id, v_uid, p_side, p_amount)
  on conflict (poll_id, user_id)
    do update set amount = bets.amount + excluded.amount;

  insert into public.transactions (group_id, user_id, type, amount_signed, poll_id)
  values (v_poll.group_id, v_uid, 'BET', -p_amount, p_poll_id);

  return v_balance - p_amount;
end;
$fn$;

-- --- proponer el resultado --------------------------------------------------
-- Lo propone el creador cuando ya pasó el evento; el árbitro después confirma.
create or replace function public.propose_outcome(p_poll_id uuid, p_outcome text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_poll public.polls;
begin
  if p_outcome not in ('YES','NO') then
    raise exception 'Resultado inválido.';
  end if;

  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found then
    raise exception 'La predicción no existe.';
  end if;
  if v_poll.creator_id <> auth.uid() then
    raise exception 'Sólo quien la creó puede proponer el resultado.';
  end if;
  if v_poll.status <> 'OPEN' or v_poll.betting_closes_at > now() then
    raise exception 'Todavía no cerraron las apuestas.';
  end if;

  update public.polls
     set status = 'PENDING_RESULT',
         proposed_outcome = p_outcome,
         proposed_by = auth.uid()
   where id = p_poll_id;
end;
$fn$;

-- --- resolver y pagar -------------------------------------------------------
-- Reparto pari-mutuel en enteros: parte entera y el resto por mayor residuo,
-- con desempate determinista. Es el mismo algoritmo que `distributePool` en
-- lib/domain/market.ts, y tiene que dar exactamente lo mismo (§4.3).
--
-- Todo pasa dentro de la función, o sea dentro de una transacción: o se
-- insertan todos los pagos y cambia el estado, o no pasa nada.
create or replace function public.resolve_poll(p_poll_id uuid, p_outcome text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_poll public.polls;
  v_pool integer;
  v_winning_total integer;
begin
  if p_outcome not in ('YES','NO','VOID') then
    raise exception 'Resultado inválido.';
  end if;

  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found then
    raise exception 'La predicción no existe.';
  end if;
  if not public.is_group_admin(v_poll.group_id) then
    raise exception 'Sólo el árbitro puede resolver.';
  end if;
  -- §14: no resolver dos veces.
  if v_poll.status in ('RESOLVED_YES','RESOLVED_NO','VOID') then
    raise exception 'Esta predicción ya está resuelta.';
  end if;
  if v_poll.status in ('PENDING_APPROVAL','REJECTED') then
    raise exception 'Esta predicción no llegó a abrirse.';
  end if;

  if p_outcome = 'VOID' then
    -- §5.5: cada uno recupera exactamente lo suyo.
    insert into public.transactions (group_id, user_id, type, amount_signed, poll_id)
    select v_poll.group_id, b.user_id, 'REFUND', b.amount, v_poll.id
      from public.bets b
     where b.poll_id = v_poll.id;
  else
    select coalesce(sum(amount), 0) into v_pool
      from public.bets where poll_id = v_poll.id;
    select coalesce(sum(amount), 0) into v_winning_total
      from public.bets where poll_id = v_poll.id and side = p_outcome;

    -- Sin ganadores no hay payout: los puntos salen de circulación (§14).
    if v_pool > 0 and v_winning_total > 0 then
      with shares as (
        select b.user_id,
               (b.amount::bigint * v_pool) / v_winning_total as base,
               (b.amount::bigint * v_pool) % v_winning_total as rem,
               b.amount as stake
          from public.bets b
         where b.poll_id = v_poll.id
           and b.side = p_outcome
      ),
      ranked as (
        select s.*,
               row_number() over (
                 order by s.rem desc, s.stake desc, s.user_id::text asc
               ) as rn,
               v_pool - sum(s.base) over () as leftover
          from shares s
      )
      insert into public.transactions (group_id, user_id, type, amount_signed, poll_id)
      select v_poll.group_id,
             r.user_id,
             'PAYOUT',
             (r.base + case when r.rn <= r.leftover then 1 else 0 end)::integer,
             v_poll.id
        from ranked r
       where r.base + case when r.rn <= r.leftover then 1 else 0 end > 0;
    end if;
  end if;

  update public.polls
     set status = case p_outcome
                    when 'YES' then 'RESOLVED_YES'
                    when 'NO' then 'RESOLVED_NO'
                    else 'VOID'
                  end
   where id = p_poll_id;
end;
$fn$;

-- --- chat -------------------------------------------------------------------
create or replace function public.send_poll_message(p_poll_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_group uuid;
  v_id uuid;
begin
  select group_id into v_group from public.polls where id = p_poll_id;
  if not found then
    raise exception 'La predicción no existe.';
  end if;
  if not public.is_group_member(v_group) then
    raise exception 'No sos parte de este grupo.';
  end if;
  if length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'El mensaje está vacío.';
  end if;

  insert into public.messages (poll_id, user_id, body)
  values (p_poll_id, auth.uid(), btrim(p_body))
  returning id into v_id;

  return v_id;
end;
$fn$;

revoke all on function public.create_poll(uuid, text, text, timestamptz, timestamptz) from public;
revoke all on function public.review_poll(uuid, boolean) from public;
revoke all on function public.place_bet(uuid, text, integer) from public;
revoke all on function public.propose_outcome(uuid, text) from public;
revoke all on function public.resolve_poll(uuid, text) from public;
revoke all on function public.send_poll_message(uuid, text) from public;

grant execute on function public.create_poll(uuid, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.review_poll(uuid, boolean) to authenticated;
grant execute on function public.place_bet(uuid, text, integer) to authenticated;
grant execute on function public.propose_outcome(uuid, text) to authenticated;
grant execute on function public.resolve_poll(uuid, text) to authenticated;
grant execute on function public.send_poll_message(uuid, text) to authenticated;

-- ===========================================================================
-- 6. RLS: leer sí, escribir no
--
--    Las cuatro tablas se leen si sos del grupo. No hay ninguna policy de
--    INSERT/UPDATE/DELETE, y encima se revoca el permiso: toda escritura entra
--    por las RPC de arriba, que corren como dueño y se saltean RLS.
-- ===========================================================================

alter table public.polls enable row level security;
alter table public.bets enable row level security;
alter table public.transactions enable row level security;
alter table public.messages enable row level security;

-- Qué grupo es el de una poll, sin arrastrar el RLS de `polls` a las policies
-- de `bets` y `messages` (que sería la misma recursión de fix-rls-recursion.sql).
create or replace function public.poll_group_id(p_poll_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $fn$
  select group_id from public.polls where id = p_poll_id;
$fn$;

revoke all on function public.poll_group_id(uuid) from public;
grant execute on function public.poll_group_id(uuid) to authenticated;

drop policy if exists "polls_select" on public.polls;
create policy "polls_select"
  on public.polls for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "bets_select" on public.bets;
create policy "bets_select"
  on public.bets for select to authenticated
  using (public.is_group_member(public.poll_group_id(poll_id)));

-- Se ven las de todo el grupo: el ranking necesita el saldo de los demás y el
-- pozo necesita las apuestas de todos.
drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select"
  on public.transactions for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "messages_select" on public.messages;
create policy "messages_select"
  on public.messages for select to authenticated
  using (public.is_group_member(public.poll_group_id(poll_id)));

revoke insert, update, delete on public.polls from anon, authenticated;
revoke insert, update, delete on public.bets from anon, authenticated;
revoke insert, update, delete on public.transactions from anon, authenticated;
revoke insert, update, delete on public.messages from anon, authenticated;

grant select on public.polls to authenticated;
grant select on public.bets to authenticated;
grant select on public.transactions to authenticated;
grant select on public.messages to authenticated;

-- ===========================================================================
-- 7. Control
-- ===========================================================================

-- Saldo de cada uno en cada grupo, con el detalle de cómo se formó.
select g.name as grupo,
       p.username,
       sum(t.amount_signed) filter (where t.type = 'INITIAL_BALANCE') as inicial,
       sum(t.amount_signed) filter (where t.type = 'BET') as apostado,
       sum(t.amount_signed) filter (where t.type = 'PAYOUT') as cobrado,
       sum(t.amount_signed) filter (where t.type = 'REFUND') as devuelto,
       sum(t.amount_signed) as saldo
  from public.transactions t
  join public.groups g on g.id = t.group_id
  left join public.profiles p on p.id = t.user_id
 group by g.name, p.username
 order by g.name, saldo desc;

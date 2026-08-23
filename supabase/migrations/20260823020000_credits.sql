-- Credits are server-controlled. Browser clients may read only their own wallet and
-- ledger rows through RLS; all balance mutations happen through service-role-only RPCs.

create table if not exists public.credit_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null check (delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  reason text not null check (
    reason in (
      'signup',
      'generation_charge',
      'generation_refund',
      'purchase',
      'adjustment'
    )
  ),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  related_idempotency_key text check (
    related_idempotency_key is null
    or char_length(related_idempotency_key) between 1 and 200
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, idempotency_key),
  check (
    (reason = 'generation_refund' and related_idempotency_key is not null)
    or (reason <> 'generation_refund' and related_idempotency_key is null)
  )
);

create index if not exists credit_ledger_user_created_idx
on public.credit_ledger (user_id, created_at desc);

create unique index if not exists credit_ledger_generation_refund_once_idx
on public.credit_ledger (user_id, related_idempotency_key)
where reason = 'generation_refund';

alter table public.credit_wallets enable row level security;
alter table public.credit_ledger enable row level security;

-- Explicit table privileges are required in addition to RLS. Anonymous clients
-- receive no table access. Authenticated clients may SELECT, with the policies
-- below restricting those reads to rows owned by auth.uid(). All mutations stay
-- behind the service-role-only SECURITY DEFINER functions.
revoke all on table public.credit_wallets from anon, authenticated;
revoke all on table public.credit_ledger from anon, authenticated;
grant select on table public.credit_wallets to authenticated;
grant select on table public.credit_ledger to authenticated;

drop trigger if exists credit_wallets_set_updated_at on public.credit_wallets;
create trigger credit_wallets_set_updated_at
before update on public.credit_wallets
for each row execute function public.set_updated_at();

drop policy if exists "credit_wallets_select_own" on public.credit_wallets;
create policy "credit_wallets_select_own"
on public.credit_wallets
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "credit_ledger_select_own" on public.credit_ledger;
create policy "credit_ledger_select_own"
on public.credit_ledger
for select
to authenticated
using ((select auth.uid()) = user_id);

-- There are intentionally no INSERT/UPDATE/DELETE browser policies for either
-- table. Trusted server code uses service-role-only functions below.

create or replace function public.ensure_credit_wallet(
  p_user_id uuid,
  p_signup_credits integer
)
returns table(balance integer, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_created boolean := false;
  v_balance integer;
begin
  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED' using errcode = '22023';
  end if;

  if p_signup_credits is null or p_signup_credits < 0 or p_signup_credits > 100000 then
    raise exception 'INVALID_SIGNUP_CREDITS' using errcode = '22023';
  end if;

  insert into public.credit_wallets (user_id, balance)
  values (p_user_id, p_signup_credits)
  on conflict (user_id) do nothing;

  if found then
    v_created := true;

    if p_signup_credits > 0 then
      insert into public.credit_ledger (
        user_id,
        delta,
        balance_after,
        reason,
        idempotency_key,
        metadata
      )
      values (
        p_user_id,
        p_signup_credits,
        p_signup_credits,
        'signup',
        'signup',
        jsonb_build_object('source', 'signup_credit_provisioning')
      )
      on conflict (user_id, idempotency_key) do nothing;
    end if;
  end if;

  select w.balance
  into v_balance
  from public.credit_wallets as w
  where w.user_id = p_user_id;

  return query select v_balance, v_created;
end;
$$;

create or replace function public.charge_generation_credits(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(balance integer, applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
  v_existing_balance integer;
  v_existing_delta integer;
  v_existing_reason text;
begin
  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED' using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_CREDIT_AMOUNT' using errcode = '22023';
  end if;

  if p_idempotency_key is null or char_length(p_idempotency_key) < 1 or char_length(p_idempotency_key) > 200 then
    raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode = '22023';
  end if;

  -- Lock one wallet row so concurrent requests for a user serialize before the
  -- idempotency check and balance mutation.
  select w.balance
  into v_balance
  from public.credit_wallets as w
  where w.user_id = p_user_id
  for update;

  if not found then
    raise exception 'CREDIT_WALLET_NOT_FOUND' using errcode = 'P0001';
  end if;

  select l.balance_after, l.delta, l.reason
  into v_existing_balance, v_existing_delta, v_existing_reason
  from public.credit_ledger as l
  where l.user_id = p_user_id
    and l.idempotency_key = p_idempotency_key;

  if found then
    if v_existing_reason <> 'generation_charge' or v_existing_delta <> -p_amount then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = 'P0001';
    end if;

    return query select v_existing_balance, false;
    return;
  end if;

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;

  v_balance := v_balance - p_amount;

  update public.credit_wallets
  set balance = v_balance
  where user_id = p_user_id;

  insert into public.credit_ledger (
    user_id,
    delta,
    balance_after,
    reason,
    idempotency_key,
    metadata
  )
  values (
    p_user_id,
    -p_amount,
    v_balance,
    'generation_charge',
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return query select v_balance, true;
end;
$$;

create or replace function public.refund_generation_credits(
  p_user_id uuid,
  p_charge_idempotency_key text,
  p_refund_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(balance integer, applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
  v_charge_delta integer;
  v_existing_balance integer;
  v_existing_reason text;
  v_existing_related_key text;
  v_refund_amount integer;
begin
  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED' using errcode = '22023';
  end if;

  if p_charge_idempotency_key is null
    or char_length(p_charge_idempotency_key) < 1
    or char_length(p_charge_idempotency_key) > 200 then
    raise exception 'INVALID_CHARGE_IDEMPOTENCY_KEY' using errcode = '22023';
  end if;

  if p_refund_idempotency_key is null
    or char_length(p_refund_idempotency_key) < 1
    or char_length(p_refund_idempotency_key) > 200 then
    raise exception 'INVALID_REFUND_IDEMPOTENCY_KEY' using errcode = '22023';
  end if;

  select w.balance
  into v_balance
  from public.credit_wallets as w
  where w.user_id = p_user_id
  for update;

  if not found then
    raise exception 'CREDIT_WALLET_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- A charge may be compensated at most once, even if a caller accidentally
  -- retries with a different refund idempotency key.
  select l.balance_after
  into v_existing_balance
  from public.credit_ledger as l
  where l.user_id = p_user_id
    and l.reason = 'generation_refund'
    and l.related_idempotency_key = p_charge_idempotency_key;

  if found then
    return query select v_existing_balance, false;
    return;
  end if;

  -- A reused refund request key must refer to this same refund operation rather
  -- than silently aliasing an unrelated ledger entry.
  select l.balance_after, l.reason, l.related_idempotency_key
  into v_existing_balance, v_existing_reason, v_existing_related_key
  from public.credit_ledger as l
  where l.user_id = p_user_id
    and l.idempotency_key = p_refund_idempotency_key;

  if found then
    if v_existing_reason <> 'generation_refund'
      or v_existing_related_key <> p_charge_idempotency_key then
      raise exception 'REFUND_IDEMPOTENCY_KEY_CONFLICT' using errcode = 'P0001';
    end if;

    return query select v_existing_balance, false;
    return;
  end if;

  select l.delta
  into v_charge_delta
  from public.credit_ledger as l
  where l.user_id = p_user_id
    and l.idempotency_key = p_charge_idempotency_key
    and l.reason = 'generation_charge';

  if not found or v_charge_delta >= 0 then
    raise exception 'GENERATION_CHARGE_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_refund_amount := -v_charge_delta;
  v_balance := v_balance + v_refund_amount;

  update public.credit_wallets
  set balance = v_balance
  where user_id = p_user_id;

  insert into public.credit_ledger (
    user_id,
    delta,
    balance_after,
    reason,
    idempotency_key,
    related_idempotency_key,
    metadata
  )
  values (
    p_user_id,
    v_refund_amount,
    v_balance,
    'generation_refund',
    p_refund_idempotency_key,
    p_charge_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return query select v_balance, true;
end;
$$;

revoke all on function public.ensure_credit_wallet(uuid, integer) from public, anon, authenticated;
revoke all on function public.charge_generation_credits(uuid, integer, text, jsonb) from public, anon, authenticated;
revoke all on function public.refund_generation_credits(uuid, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.ensure_credit_wallet(uuid, integer) to service_role;
grant execute on function public.charge_generation_credits(uuid, integer, text, jsonb) to service_role;
grant execute on function public.refund_generation_credits(uuid, text, text, jsonb) to service_role;

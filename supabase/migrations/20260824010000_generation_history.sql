-- Persistent private image assets and generation history.
-- Images remain private in Supabase Storage and are accessed through trusted server code.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'user-images',
  'user-images',
  false,
  52428800,
  array['image/png']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.image_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('source', 'generated')),
  storage_path text not null unique,
  mime_type text not null default 'image/png' check (mime_type = 'image/png'),
  byte_size bigint not null check (byte_size > 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  openai_file_id text,
  openai_expires_at timestamptz,
  parent_asset_id uuid references public.image_assets(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists image_assets_user_created_idx
on public.image_assets (user_id, created_at desc);

create table if not exists public.generation_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_asset_id uuid not null references public.image_assets(id) on delete restrict,
  output_asset_id uuid references public.image_assets(id) on delete set null,
  model_id text not null check (char_length(model_id) between 1 and 100),
  credit_cost integer not null check (credit_cost > 0),
  prompt text not null check (char_length(prompt) between 1 and 8000),
  status text not null default 'running' check (
    status in ('running', 'succeeded', 'failed', 'cancelled')
  ),
  error_code text check (error_code is null or char_length(error_code) <= 100),
  error_message text check (error_message is null or char_length(error_message) <= 500),
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists generation_jobs_user_created_idx
on public.generation_jobs (user_id, created_at desc);

alter table public.image_assets enable row level security;
alter table public.generation_jobs enable row level security;

-- Browser roles are read-only. The trusted server client uses the service_role key
-- and needs explicit table privileges for durable asset/job writes.
revoke all on table public.image_assets from anon, authenticated;
revoke all on table public.generation_jobs from anon, authenticated;
grant select on table public.image_assets to authenticated;
grant select on table public.generation_jobs to authenticated;
grant select, insert, update, delete on table public.image_assets to service_role;
grant select, insert, update, delete on table public.generation_jobs to service_role;

drop trigger if exists image_assets_set_updated_at on public.image_assets;
create trigger image_assets_set_updated_at
before update on public.image_assets
for each row execute function public.set_updated_at();

drop policy if exists "image_assets_select_own" on public.image_assets;
create policy "image_assets_select_own"
on public.image_assets
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "generation_jobs_select_own" on public.generation_jobs;
create policy "generation_jobs_select_own"
on public.generation_jobs
for select
to authenticated
using ((select auth.uid()) = user_id);

-- No storage.objects policies are created. All Storage reads/writes are performed by
-- trusted server code using the service role, while browsers only receive short-lived
-- signed download URLs for assets that have already passed an ownership check.

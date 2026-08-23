-- Durable private image assets and generation history.
-- Browser uploads use server-created signed upload tokens. Direct table mutations
-- remain server-only and private Storage objects are served through signed URLs.

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
  array['image/*']::text[]
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
  status text not null default 'uploading' check (status in ('uploading', 'ready', 'failed')),
  storage_path text not null unique,
  original_filename text check (original_filename is null or char_length(original_filename) <= 180),
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  openai_file_id text,
  openai_expires_at timestamptz,
  parent_asset_id uuid references public.image_assets(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists image_assets_user_created_idx
on public.image_assets (user_id, created_at desc);

create index if not exists image_assets_user_openai_file_idx
on public.image_assets (user_id, openai_file_id)
where openai_file_id is not null;

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
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists generation_jobs_user_created_idx
on public.generation_jobs (user_id, created_at desc);

alter table public.image_assets enable row level security;
alter table public.generation_jobs enable row level security;

revoke insert, update, delete, truncate on table public.image_assets from anon, authenticated;
revoke insert, update, delete, truncate on table public.generation_jobs from anon, authenticated;

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

-- No storage.objects policies are created. Application users receive signed upload
-- tokens for one server-chosen object path and time-limited signed download URLs;
-- ordinary authenticated Storage access remains denied by default.

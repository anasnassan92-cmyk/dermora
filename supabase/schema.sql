-- =============================================================================
-- Dermora – database schema (Supabase / PostgreSQL)
-- Release 1 / MVP
--
-- Owner: Assad (Backend + database). Reviewed by the whole team.
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent where possible.
--
-- Design rules
--   * Every table that holds user data has a `user_id` referencing auth.users
--     and Row Level Security (RLS) so that a user can only ever read/write
--     their own rows – even if the anon key leaks.
--   * The FastAPI backend uses the service-role key and enforces the same rule
--     in code (user_id taken from the verified JWT, never from the request body).
--   * Images are NOT stored in the database. Only a path into the private
--   * storage bucket `skin-images` is stored (see end of file).
--   * No biometric templates are ever stored. `face_check` holds only a
--     quality verdict (face found / blur / brightness), not face geometry.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enumerations
-- -----------------------------------------------------------------------------
do $$ begin
  create type skin_type as enum ('oily', 'dry', 'combination', 'normal', 'sensitive', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type assessment_status as enum ('draft', 'submitted', 'analyzed', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_status as enum ('proposed', 'confirmed', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chat_role as enum ('user', 'assistant', 'system');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 1. profiles – one row per auth user (created by trigger on sign-up)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text,
  birth_year     int check (birth_year is null or birth_year between 1900 and 2100),
  age_range      text check (age_range is null or age_range in ('under_18','18_24','25_34','35_44','45_54','55_plus')),
  gender         text check (gender is null or gender in ('female','male','non_binary','undisclosed')),
  country        char(2) default 'SE',
  skin_tone      smallint check (skin_tone is null or skin_tone between 1 and 6),  -- Fitzpatrick I–VI
  skin_type      skin_type not null default 'unknown',
  consent_images boolean not null default false,  -- GDPR: explicit consent to process skin images
  consent_at     timestamptz,
  locale         text not null default 'sv',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Auto-create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. questionnaire definition – versioned, with conditional follow-ups
--    (Adam owns the content; stored as JSON so it can evolve without migrations)
-- -----------------------------------------------------------------------------
create table if not exists public.questionnaire_versions (
  id          serial primary key,
  version     text not null unique,            -- e.g. '1.0.0'
  schema      jsonb not null,                  -- see apps/api/src/data/questionnaire_v1.json
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index if not exists questionnaire_single_active
  on public.questionnaire_versions (is_active) where is_active;

-- -----------------------------------------------------------------------------
-- 3. assessments – one "round": answers + images + AI result
-- -----------------------------------------------------------------------------
create table if not exists public.assessments (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  questionnaire_version   text not null,
  status                  assessment_status not null default 'draft',
  answers                 jsonb not null default '{}'::jsonb,  -- { question_id: answer }
  created_at              timestamptz not null default now(),
  submitted_at            timestamptz,
  analyzed_at             timestamptz
);
create index if not exists assessments_user_idx on public.assessments (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 4. skin_images – metadata only; the file lives in the private bucket
--    (Ali owns upload; the backend writes face_check)
-- -----------------------------------------------------------------------------
create table if not exists public.skin_images (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  assessment_id  uuid references public.assessments (id) on delete set null,
  storage_path   text not null unique,         -- '<user_id>/<image_id>.jpg' in bucket skin-images
  area           text not null default 'face', -- face (framifrån) | left | right | closeup | other
  width          int,
  height         int,
  bytes          int,
  face_check     jsonb,                        -- { face_found, faces, blur_score, brightness, ok, reasons[] }
  taken_at       timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
create index if not exists skin_images_user_idx on public.skin_images (user_id, created_at desc);
create index if not exists skin_images_assessment_idx on public.skin_images (assessment_id);

-- -----------------------------------------------------------------------------
-- 5. ai_assessments – structured AI output for an assessment (Youssef)
-- -----------------------------------------------------------------------------
create table if not exists public.ai_assessments (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  provider       text not null,                -- 'anthropic' | 'mock'
  model          text not null,
  result         jsonb not null,               -- SkinGuidance schema (apps/api/src/schemas/ai.py)
  red_flags      text[] not null default '{}', -- copied out of result for quick querying
  input_tokens   int,
  output_tokens  int,
  created_at     timestamptz not null default now()
);
create index if not exists ai_assessments_assessment_idx on public.ai_assessments (assessment_id);

-- -----------------------------------------------------------------------------
-- 6. chat_messages – the guidance conversation, per assessment
-- -----------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id             bigserial primary key,
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  role           chat_role not null,
  content        text not null,
  created_at     timestamptz not null default now()
);
create index if not exists chat_messages_assessment_idx on public.chat_messages (assessment_id, id);

-- -----------------------------------------------------------------------------
-- 7. treatment_plans – proposed by AI, confirmed by the user (Even)
-- -----------------------------------------------------------------------------
create table if not exists public.treatment_plans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  assessment_id  uuid references public.assessments (id) on delete set null,
  status         plan_status not null default 'proposed',
  title          text not null,
  summary        text,
  plan           jsonb not null,               -- TreatmentPlan schema (morning[], evening[], weekly[], avoid[], follow_up_days)
  confirmed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists treatment_plans_user_idx on public.treatment_plans (user_id, created_at desc);
-- A user has at most one confirmed (active) plan at a time
create unique index if not exists treatment_plans_one_confirmed
  on public.treatment_plans (user_id) where status = 'confirmed';

-- -----------------------------------------------------------------------------
-- 8. beta_signups – from the landing page (no auth)
-- -----------------------------------------------------------------------------
create table if not exists public.beta_signups (
  id          bigserial primary key,
  email       text not null unique,
  source      text default 'landing',
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists treatment_plans_touch on public.treatment_plans;
create trigger treatment_plans_touch before update on public.treatment_plans
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles            enable row level security;
alter table public.questionnaire_versions enable row level security;
alter table public.assessments         enable row level security;
alter table public.skin_images         enable row level security;
alter table public.ai_assessments      enable row level security;
alter table public.chat_messages       enable row level security;
alter table public.treatment_plans     enable row level security;
alter table public.beta_signups        enable row level security;

-- profiles: own row only
drop policy if exists "profiles self" on public.profiles;
create policy "profiles self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- questionnaire: everyone logged in can read the active version; nobody writes via client
drop policy if exists "questionnaire read" on public.questionnaire_versions;
create policy "questionnaire read" on public.questionnaire_versions
  for select using (auth.role() = 'authenticated');

-- generic "own rows" policies
drop policy if exists "assessments self" on public.assessments;
create policy "assessments self" on public.assessments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "skin_images self" on public.skin_images;
create policy "skin_images self" on public.skin_images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ai_assessments self read" on public.ai_assessments;
create policy "ai_assessments self read" on public.ai_assessments
  for select using (auth.uid() = user_id);   -- only the backend (service role) inserts

drop policy if exists "chat_messages self" on public.chat_messages;
create policy "chat_messages self" on public.chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "treatment_plans self" on public.treatment_plans;
create policy "treatment_plans self" on public.treatment_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- beta_signups: insert-only for anonymous visitors, nobody reads via client
drop policy if exists "beta insert" on public.beta_signups;
create policy "beta insert" on public.beta_signups
  for insert with check (true);

-- =============================================================================
-- Storage: private bucket for skin images
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('skin-images', 'skin-images', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false;

-- A user may only touch objects under their own folder: '<user_id>/...'
drop policy if exists "skin images own folder select" on storage.objects;
create policy "skin images own folder select" on storage.objects
  for select using (bucket_id = 'skin-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "skin images own folder insert" on storage.objects;
create policy "skin images own folder insert" on storage.objects
  for insert with check (bucket_id = 'skin-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "skin images own folder delete" on storage.objects;
create policy "skin images own folder delete" on storage.objects
  for delete using (bucket_id = 'skin-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- GDPR helper: delete everything about a user (called by the backend on
-- "Radera mitt konto"). Storage objects are removed by the backend first.
-- =============================================================================
create or replace function public.delete_user_data(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.chat_messages    where user_id = target;
  delete from public.ai_assessments   where user_id = target;
  delete from public.treatment_plans  where user_id = target;
  delete from public.skin_images      where user_id = target;
  delete from public.assessments      where user_id = target;
  delete from public.profiles         where id = target;
end $$;

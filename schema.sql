-- ========================================
-- StudyFlow — Supabase Database Schema
-- Run this ENTIRE file in Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → paste → Run)
-- ========================================

-- 1) PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  avatar_emoji text default '🎓',
  exam_target text default 'GATE + ESE 2027',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- 2) SUBJECTS
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text not null default 'custom',
  schedule_type text not null default 'scheduled',
  start_date date,
  end_date date,
  color_index int default 0,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table public.subjects enable row level security;
create policy "Users manage own subjects" on public.subjects for all using (auth.uid() = user_id);

-- Index for fast lookups
create index if not exists idx_subjects_user on public.subjects(user_id);

-- 3) TASKS
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  date date not null,
  title text not null,
  notes text default '',
  estimated_time int default 0,
  completed boolean default false,
  completed_at timestamptz,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table public.tasks enable row level security;
create policy "Users manage own tasks" on public.tasks for all using (auth.uid() = user_id);

-- Indexes for fast queries
create index if not exists idx_tasks_user_date on public.tasks(user_id, date);
create index if not exists idx_tasks_subject on public.tasks(subject_id);

-- 4) REFLECTIONS
create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  went_well text default '',
  needs_improvement text default '',
  saved_at timestamptz default now(),
  unique(user_id, date)
);
alter table public.reflections enable row level security;
create policy "Users manage own reflections" on public.reflections for all using (auth.uid() = user_id);

create index if not exists idx_reflections_user_date on public.reflections(user_id, date);

-- 5) AUTO-CREATE PROFILE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

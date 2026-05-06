-- ============================================================
-- Habitflow — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Users (extends Supabase auth.users) ──────────────────────
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Habits ───────────────────────────────────────────────────
create type habit_category as enum ('health', 'productivity', 'wellness');
create type habit_frequency as enum ('daily', 'weekdays', 'weekends', 'custom');

create table public.habits (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  name          text not null,
  description   text,
  category      habit_category not null default 'health',
  frequency     habit_frequency not null default 'daily',
  custom_days   int[] default null,        -- 0=Sun, 1=Mon ... 6=Sat (for custom frequency)
  target_time   time default null,         -- optional reminder time
  color         text default '#7F77DD',    -- hex color for UI
  icon          text default 'circle',     -- lucide icon name
  is_active     boolean default true,
  sort_order    int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── Habit Logs ───────────────────────────────────────────────
create type log_status as enum ('done', 'skipped', 'missed');

create table public.habit_logs (
  id         uuid default uuid_generate_v4() primary key,
  habit_id   uuid references public.habits(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  log_date   date not null,
  status     log_status not null default 'done',
  note       text,
  created_at timestamptz default now(),
  unique(habit_id, log_date)   -- one log per habit per day
);

-- ── Streaks ──────────────────────────────────────────────────
create table public.streaks (
  id              uuid default uuid_generate_v4() primary key,
  habit_id        uuid references public.habits(id) on delete cascade not null unique,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  current_streak  int default 0,
  longest_streak  int default 0,
  last_log_date   date,
  updated_at      timestamptz default now()
);

-- ── Journal Entries ──────────────────────────────────────────
create table public.journal_entries (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  entry_date date not null default current_date,
  content    text not null,
  mood       int check (mood between 1 and 5),
  created_at timestamptz default now(),
  unique(user_id, entry_date)
);

-- ── Row Level Security ───────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.habits         enable row level security;
alter table public.habit_logs     enable row level security;
alter table public.streaks        enable row level security;
alter table public.journal_entries enable row level security;

-- Profiles: users can only see/edit their own
create policy "users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Habits
create policy "users can crud own habits" on public.habits for all using (auth.uid() = user_id);

-- Habit logs
create policy "users can crud own logs" on public.habit_logs for all using (auth.uid() = user_id);

-- Streaks
create policy "users can crud own streaks" on public.streaks for all using (auth.uid() = user_id);

-- Journal
create policy "users can crud own journal" on public.journal_entries for all using (auth.uid() = user_id);

-- ── Indexes ──────────────────────────────────────────────────
create index habits_user_id_idx      on public.habits(user_id);
create index habit_logs_habit_id_idx on public.habit_logs(habit_id);
create index habit_logs_date_idx     on public.habit_logs(log_date);
create index habit_logs_user_date_idx on public.habit_logs(user_id, log_date);
create index journal_user_date_idx   on public.journal_entries(user_id, entry_date);

-- ── Helper: update streak on log insert ──────────────────────
create or replace function public.update_streak()
returns trigger language plpgsql security definer as $$
declare
  v_last_date date;
  v_current   int;
  v_longest   int;
begin
  -- Only count 'done' logs
  if new.status != 'done' then return new; end if;

  select last_log_date, current_streak, longest_streak
  into v_last_date, v_current, v_longest
  from public.streaks where habit_id = new.habit_id;

  if not found then
    insert into public.streaks(habit_id, user_id, current_streak, longest_streak, last_log_date)
    values(new.habit_id, new.user_id, 1, 1, new.log_date);
    return new;
  end if;

  if v_last_date = new.log_date - 1 then
    v_current := v_current + 1;
  elsif v_last_date = new.log_date then
    return new; -- already counted today
  else
    v_current := 1;
  end if;

  v_longest := greatest(v_longest, v_current);

  update public.streaks
  set current_streak = v_current,
      longest_streak = v_longest,
      last_log_date  = new.log_date,
      updated_at     = now()
  where habit_id = new.habit_id;

  return new;
end;
$$;

create trigger on_habit_log_insert
  after insert on public.habit_logs
  for each row execute procedure public.update_streak();

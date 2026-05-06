-- ── Leaderboard (opt-in public streaks) ─────────────────────
create table if not exists public.leaderboard (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null unique,
  display_name text not null,
  best_streak  int default 0,
  total_done   int default 0,
  updated_at   timestamptz default now()
);
alter table public.leaderboard enable row level security;
create policy "leaderboard is public" on public.leaderboard for select using (true);
create policy "users can manage own entry" on public.leaderboard for all using (auth.uid() = user_id);

-- ── Achievements ─────────────────────────────────────────────
create table if not exists public.achievements (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  key          text not null,  -- e.g. 'streak_7', 'checkins_100'
  unlocked_at  timestamptz default now(),
  unique(user_id, key)
);
alter table public.achievements enable row level security;
create policy "users can see own achievements" on public.achievements for all using (auth.uid() = user_id);

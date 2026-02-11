-- Combo Check : tables + RLS pour sync multi-appareils
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller et Run

-- Table : historique des tirages (un enregistrement par utilisateur)
create table if not exists public.euromillions_history (
  user_id uuid primary key references auth.users(id) on delete cascade,
  draws jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- Table : combos personnelles
create table if not exists public.personal_combos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  numbers jsonb not null,
  stars jsonb not null,
  date timestamptz not null,
  created_at timestamptz not null default now()
);

-- Index pour filtrer par user
create index if not exists idx_personal_combos_user_id on public.personal_combos(user_id);

-- RLS : chaque utilisateur ne voit que ses données
alter table public.euromillions_history enable row level security;
alter table public.personal_combos enable row level security;

-- Policies euromillions_history
create policy "Users can read own history"
  on public.euromillions_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on public.euromillions_history for insert
  with check (auth.uid() = user_id);

create policy "Users can update own history"
  on public.euromillions_history for update
  using (auth.uid() = user_id);

-- Policies personal_combos
create policy "Users can read own combos"
  on public.personal_combos for select
  using (auth.uid() = user_id);

create policy "Users can insert own combos"
  on public.personal_combos for insert
  with check (auth.uid() = user_id);

create policy "Users can update own combos"
  on public.personal_combos for update
  using (auth.uid() = user_id);

create policy "Users can delete own combos"
  on public.personal_combos for delete
  using (auth.uid() = user_id);

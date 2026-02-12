-- Table centrale des tirages EuroMillions (lecture pour tous, écriture via service role / Edge Function)
create table if not exists public.euromillions_draws (
  id uuid primary key default gen_random_uuid(),
  date text not null,
  numbers jsonb not null,
  stars jsonb not null,
  created_at timestamptz not null default now(),
  constraint uq_draw_date_numbers unique (date, numbers)
);

create index if not exists idx_euromillions_draws_date on public.euromillions_draws(date);

alter table public.euromillions_draws enable row level security;

-- Lecture autorisée pour tous (anon + authentifiés) : Vérifier et Générer fonctionnent sans connexion
create policy "Anyone can read draws"
  on public.euromillions_draws for select
  using (true);

-- Insert réservé au service role (Edge Function, script d'import)
-- Pas de policy INSERT pour les users : seuls service_role et les Edge Functions avec clé peuvent insérer

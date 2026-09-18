create table if not exists public.pwa_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pwa_push_subscriptions_user_id
  on public.pwa_push_subscriptions(user_id);

create index if not exists idx_pwa_push_subscriptions_updated_at
  on public.pwa_push_subscriptions(updated_at desc);

alter table public.pwa_push_subscriptions enable row level security;

create policy "Users can manage their own push subscriptions"
  on public.pwa_push_subscriptions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read their own push subscriptions"
  on public.pwa_push_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

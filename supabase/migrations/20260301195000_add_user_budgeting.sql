alter table if exists public.users
  add column if not exists salary_amount numeric(12,2) not null default 0,
  add column if not exists salary_currency text not null default 'HNL';

alter table if exists public.users
  drop constraint if exists users_salary_currency_check;

alter table if exists public.users
  add constraint users_salary_currency_check check (salary_currency in ('HNL', 'USD'));

create table if not exists public.user_category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  allocation_percent numeric(5,2) not null check (allocation_percent >= 0 and allocation_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);

create index if not exists idx_user_category_budgets_user on public.user_category_budgets (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_category_budgets_updated_at on public.user_category_budgets;
create trigger trg_user_category_budgets_updated_at
before update on public.user_category_budgets
for each row
execute function public.set_updated_at();

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  password_hash text,
  salary_amount numeric(12,2) not null default 0,
  salary_currency text not null default 'HNL' check (salary_currency in ('HNL', 'USD')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  description text not null,
  category_id uuid not null references public.categories(id),
  amount numeric(12,2) not null,
  currency text not null default 'HNL' check (currency in ('HNL', 'USD')),
  expense_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  allocation_percent numeric(5,2) not null check (allocation_percent >= 0 and allocation_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);

create index if not exists idx_expenses_user_date_desc on public.expenses (user_id, expense_date desc);
create index if not exists idx_expenses_category_id on public.expenses (category_id);
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

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at
before update on public.expenses
for each row
execute function public.set_updated_at();

drop trigger if exists trg_user_category_budgets_updated_at on public.user_category_budgets;
create trigger trg_user_category_budgets_updated_at
before update on public.user_category_budgets
for each row
execute function public.set_updated_at();

insert into public.categories (name)
values
  ('Food'),
  ('Supplements'),
  ('Gym'),
  ('Clothes'),
  ('Going Out'),
  ('Miscellanies'),
  ('Relationship'),
  ('Medicines')
on conflict (name) do nothing;

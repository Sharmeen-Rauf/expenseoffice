-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  role text not null check (role in ('boss', 'manager', 'pending')) default 'pending',
  full_name text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create transactions table
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  date date not null default current_date,
  item text not null,
  detail text,
  type text not null check (type in ('income', 'expense')),
  currency text not null check (currency in ('USD', 'PKR')),
  amount_usd numeric(15, 2) not null default 0.00,
  amount_pkr numeric(15, 2) not null default 0.00,
  paid_by text not null,
  category text not null check (category in ('Office', 'Hardware', 'Utilities', 'Salaries', 'Investment')),
  created_by uuid references auth.users on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;

-- Profiles Policies
create policy "Allow read access to profiles for authenticated users" 
  on public.profiles for select 
  to authenticated
  using (true);

create policy "Allow update for boss only" 
  on public.profiles for update 
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'boss'
    )
  );

-- Transactions Policies
create policy "Allow read access to transactions for boss and manager"
  on public.transactions for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('boss', 'manager')
    )
  );

create policy "Allow insert access to transactions for boss and manager"
  on public.transactions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('boss', 'manager')
    )
  );

create policy "Allow update access to transactions for boss and manager"
  on public.transactions for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('boss', 'manager')
    )
  );

create policy "Allow delete access to transactions for boss only"
  on public.transactions for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'boss'
    )
  );

-- Trigger for Auto-Creating Profiles & Auto-Setting First User as Boss
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first_user boolean;
begin
  select not exists (select 1 from public.profiles) into is_first_user;
  
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    case when is_first_user then 'boss' else 'pending' end,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

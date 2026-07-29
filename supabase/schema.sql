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

-- Trigger for Auto-Creating Profiles & Auto-Setting Specified/First Users as Boss
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first_user boolean;
  assigned_role text;
begin
  select not exists (select 1 from public.profiles) into is_first_user;

  if new.email in ('zumarlatifi@gmail.com', 'sharmeenpakistan8@gmail.com') or is_first_user then
    assigned_role := 'boss';
  else
    assigned_role := 'pending';
  end if;
  
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    assigned_role,
    coalesce(new.raw_user_meta_data->>'full_name', 'Boss User')
  )
  on conflict (id) do update
  set role = excluded.role,
      email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Promote designated admin/boss emails immediately if already registered
update public.profiles
set role = 'boss'
where email in ('zumarlatifi@gmail.com', 'sharmeenpakistan8@gmail.com');


-- Audit Logs Table for Transparency & Activity Tracking
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  transaction_id uuid references public.transactions(id) on delete set null,
  action text not null check (action in ('CREATE', 'UPDATE', 'DELETE')),
  performed_by_id uuid references auth.users(id) on delete set null,
  performed_by_email text not null,
  performed_by_name text,
  item_name text not null,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on audit_logs
alter table public.audit_logs enable row level security;

create policy "Allow read access to audit logs for boss and manager"
  on public.audit_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('boss', 'manager')
    )
  );

create policy "Allow insert access to audit logs for boss and manager"
  on public.audit_logs for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('boss', 'manager')
    )
  );

-- Remove hardcoded category check constraint to allow custom categories
alter table public.transactions drop constraint if exists transactions_category_check;

-- Dynamic Categories Table
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed initial categories
insert into public.categories (name)
values ('Office'), ('Hardware'), ('Utilities'), ('Salaries'), ('Investment')
on conflict (name) do nothing;

-- RLS for Categories Table
alter table public.categories enable row level security;

create policy "Allow read access to categories for authenticated users"
  on public.categories for select
  to authenticated
  using (true);

create policy "Allow all management on categories for boss"
  on public.categories for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'boss'
    )
  );

-- Sales Leads & Client Receivable Tracker Table
create table if not exists public.sales_leads (
  id uuid default gen_random_uuid() primary key,
  date date not null default current_date,
  client_name text not null,
  lead_title text not null,
  lead_details text,
  currency text not null check (currency in ('USD', 'PKR')) default 'PKR',
  deal_amount_usd numeric(15, 2) not null default 0.00,
  deal_amount_pkr numeric(15, 2) not null default 0.00,
  received_amount_usd numeric(15, 2) not null default 0.00,
  received_amount_pkr numeric(15, 2) not null default 0.00,
  status text not null check (status in ('pending', 'partially_paid', 'paid', 'cancelled')) default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for sales_leads
alter table public.sales_leads enable row level security;

create policy "Allow read access to sales_leads for boss and manager"
  on public.sales_leads for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('boss', 'manager')
    )
  );

create policy "Allow insert access to sales_leads for boss and manager"
  on public.sales_leads for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('boss', 'manager')
    )
  );

create policy "Allow update access to sales_leads for boss and manager"
  on public.sales_leads for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('boss', 'manager')
    )
  );

create policy "Allow delete access to sales_leads for boss only"
  on public.sales_leads for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'boss'
    )
  );




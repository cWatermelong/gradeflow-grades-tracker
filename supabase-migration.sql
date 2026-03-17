-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Table to store each user's grade data as a JSON blob
create table public.user_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.user_data enable row level security;

-- Users can only read their own data
create policy "Users can read own data"
  on public.user_data for select
  using (auth.uid() = user_id);

-- Users can insert their own data
create policy "Users can insert own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

-- Users can update their own data
create policy "Users can update own data"
  on public.user_data for update
  using (auth.uid() = user_id);

-- Users can delete their own data
create policy "Users can delete own data"
  on public.user_data for delete
  using (auth.uid() = user_id);

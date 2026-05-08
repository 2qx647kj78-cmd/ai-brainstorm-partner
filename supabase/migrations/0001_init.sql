-- Brainstorm Partner: initial schema
-- sessions: one brainstorming conversation
-- messages: turns within a session, optionally linked to an audio file

create extension if not exists "pgcrypto";

create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  mode        text not null,
  provider    text not null,
  model       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists sessions_user_idx
  on public.sessions(user_id, created_at desc);

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  audio_path  text,
  created_at  timestamptz not null default now()
);

create index if not exists messages_session_idx
  on public.messages(session_id, created_at);

-- Row level security: a user only ever sees their own data.
alter table public.sessions enable row level security;
alter table public.messages enable row level security;

drop policy if exists "own_sessions_all" on public.sessions;
create policy "own_sessions_all"
  on public.sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own_messages_all" on public.messages;
create policy "own_messages_all"
  on public.messages
  for all
  using (
    exists (
      select 1 from public.sessions s
      where s.id = messages.session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = messages.session_id and s.user_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- CSR Shift Logger — Supabase schema
-- Run this in your Supabase project (SQL editor). Then put the project
-- URL + anon key into the app's .env (see README). Until then the app
-- runs on localStorage automatically.
-- ════════════════════════════════════════════════════════════════

create table if not exists roster (
  id      text primary key,
  name    text not null,
  shift   text,
  profile text,
  role    text default 'CSR',
  active  boolean default true
);

create table if not exists reports (
  id            uuid primary key default gen_random_uuid(),
  csr_name      text not null,
  shift         text,
  profile       text,
  date          date,
  start_at      timestamptz default now(),
  finish_at     timestamptz,
  checklist     jsonb default '{}'::jsonb,
  note_for_next text default '',
  note_seen_by  text,
  note_seen_at  timestamptz,
  status        text default 'open',           -- 'open' | 'submitted'
  created_at    timestamptz default now()
);
create index if not exists reports_profile_idx on reports (profile, status);
create index if not exists reports_date_idx on reports (date);

create table if not exists actions (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid references reports(id) on delete cascade,
  type       text not null,
  client     text default '',
  details    jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists actions_report_idx on actions (report_id);

-- ── Live updates (idempotent — safe to re-run) ──
do $$ begin alter publication supabase_realtime add table reports; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table actions; exception when duplicate_object then null; end $$;

-- ── Row-level security ──
-- The reports are not secret (the team log is open), so reads are allowed.
-- Writes are allowed with the anon key, but a report can only be UPDATED
-- while it is still 'open' — this enforces "no edits after submit" at the DB.
alter table roster  enable row level security;
alter table reports enable row level security;
alter table actions enable row level security;

-- drop-if-exists before create so the whole file can be re-run without errors
drop policy if exists "roster read"  on roster;
drop policy if exists "roster write" on roster;
create policy "roster read"   on roster  for select using (true);
create policy "roster write"  on roster  for all    using (true) with check (true);

drop policy if exists "reports read"             on reports;
drop policy if exists "reports insert"           on reports;
drop policy if exists "reports update while open" on reports;
create policy "reports read"   on reports for select using (true);
create policy "reports insert" on reports for insert with check (true);
create policy "reports update while open" on reports for update using (status = 'open');

drop policy if exists "actions read"                  on actions;
drop policy if exists "actions insert"                on actions;
drop policy if exists "actions update while report open" on actions;
create policy "actions read"   on actions for select using (true);
create policy "actions insert" on actions for insert with check (true);
create policy "actions update while report open" on actions for update using (
  exists (select 1 from reports r where r.id = actions.report_id and r.status = 'open')
);

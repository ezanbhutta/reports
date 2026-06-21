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
-- USING limits which rows can be updated (only open ones); WITH CHECK (true)
-- lets an open report transition to 'submitted'. Without it, Postgres reuses
-- USING as the check and rejects the submit (new status='submitted' fails).
create policy "reports update while open" on reports for update using (status = 'open') with check (true);
-- Deleting a whole report is allowed (for mistaken / wrong-profile reports); the
-- app gates it behind a two-step confirm. A report's actions cascade-delete via
-- the FK (which bypasses the actions policies, so no actions delete policy is needed).
drop policy if exists "reports delete" on reports;
create policy "reports delete" on reports for delete using (true);

drop policy if exists "actions read"                  on actions;
drop policy if exists "actions insert"                on actions;
drop policy if exists "actions update while report open" on actions;
drop policy if exists "actions delete while report open" on actions;
create policy "actions read"   on actions for select using (true);
create policy "actions insert" on actions for insert with check (true);
create policy "actions update while report open" on actions for update using (
  exists (select 1 from reports r where r.id = actions.report_id and r.status = 'open')
);
-- A CSR can delete a timeline entry only while the report is still open;
-- once submitted, entries are locked (mirrors the update policy above).
create policy "actions delete while report open" on actions for delete using (
  exists (select 1 from reports r where r.id = actions.report_id and r.status = 'open')
);

-- ── Handoff-note acknowledgement ──
-- note_seen_by / note_seen_at sit on a SUBMITTED report, which the "update while
-- open" policy blocks. This SECURITY DEFINER function records ONLY those two
-- columns so a CSR's "Noted ✓" sticks across reloads (one ack per profile+shift
-- note) instead of the handoff popping up again every time.
create or replace function ack_note(p_id uuid, p_by text)
returns void
language sql
security definer
set search_path = public
as $$
  update reports set note_seen_by = p_by, note_seen_at = now() where id = p_id;
$$;
grant execute on function ack_note(uuid, text) to anon, authenticated;

-- ── Access security log ──
-- Every wrong-password attempt on the CEO console is recorded here so the CEO
-- can review intrusion attempts. Only failed attempts store the typed password
-- (the real one is never written). Anon may insert + read; no update/delete.
create table if not exists security_log (
  id         uuid primary key default gen_random_uuid(),
  event      text not null,                 -- 'failed' | 'success'
  pw_tried   text default '',               -- the (wrong) password that was typed
  ua         text default '',               -- browser / device user-agent
  created_at timestamptz default now()
);
create index if not exists security_log_created_idx on security_log (created_at desc);

do $$ begin alter publication supabase_realtime add table security_log; exception when duplicate_object then null; end $$;

alter table security_log enable row level security;
-- Anyone may INSERT a sign-in attempt (it happens before auth); only a signed-in
-- manager may READ the log.
drop policy if exists "security read"  on security_log;
drop policy if exists "security write" on security_log;
create policy "security read"  on security_log for select using (auth.role() = 'authenticated');
create policy "security write" on security_log for insert with check (true);

-- ── Registered devices (per-laptop binding) ──
-- Each laptop gets a stable, client-generated id. The CEO assigns it a profile;
-- a device with a profile is "bound" (the CSR app locks to that profile), and
-- profile = '' means pending (blocked until the CEO assigns one).
create table if not exists devices (
  id         text primary key,
  code       text default '',
  label      text default '',
  profile    text default '',
  ua         text default '',
  meta       jsonb default '{}'::jsonb,   -- legal, permission-free device signals (browser, tz, screen, IP/city, ISP, …)
  created_at timestamptz default now(),
  last_seen  timestamptz default now()
);
-- add to existing installs too (no-op if the column is already there)
alter table devices add column if not exists meta jsonb default '{}'::jsonb;
do $$ begin alter publication supabase_realtime add table devices; exception when duplicate_object then null; end $$;
alter table devices enable row level security;
drop policy if exists "devices read"  on devices;
drop policy if exists "devices write" on devices;
create policy "devices read"  on devices for select using (true);
create policy "devices write" on devices for all    using (true) with check (true);

-- ── App settings (key/value) ──
-- Generic key/value store, kept provisioned in the database for future use.
-- The app does not currently read or write it.
create table if not exists settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
do $$ begin alter publication supabase_realtime add table settings; exception when duplicate_object then null; end $$;
alter table settings enable row level security;
drop policy if exists "settings read"  on settings;
drop policy if exists "settings write" on settings;
create policy "settings read"  on settings for select using (true);
create policy "settings write" on settings for all    using (true) with check (true);

-- ── Mistakes log (manager records, CEO reviews) ──
-- The manager records what went wrong (who, when, shift, severity); the CEO
-- reviews and signs off (status open → reviewed → resolved, optional note).
create table if not exists mistakes (
  id            uuid primary key default gen_random_uuid(),
  person        text not null,            -- who made the mistake (roster name)
  category      text default '',
  severity      text default 'Medium',    -- Low | Medium | High
  description   text default '',
  client        text default '',          -- client name (optional)
  project       text default '',          -- project (optional)
  happened_on   date,                     -- when it happened (date)
  happened_time text default '',          -- when it happened (time, free text e.g. "9:30 PM")
  shift         text default '',          -- Morning | Evening | Night
  profile       text default '',          -- brand profile (optional)
  logged_by     text default '',          -- which manager recorded it (optional)
  status        text default 'open',      -- open | reviewed | resolved
  ceo_note      text default '',          -- CEO's review note
  created_at    timestamptz default now()
);
create index if not exists mistakes_created_idx on mistakes (created_at desc);
do $$ begin alter publication supabase_realtime add table mistakes; exception when duplicate_object then null; end $$;
alter table mistakes enable row level security;
-- Manager-only: readable/writable solely by a signed-in manager (Supabase Auth).
drop policy if exists "mistakes read"  on mistakes;
drop policy if exists "mistakes write" on mistakes;
drop policy if exists "mistakes manager read"  on mistakes;
drop policy if exists "mistakes manager write" on mistakes;
create policy "mistakes manager read"  on mistakes for select using (auth.role() = 'authenticated');
create policy "mistakes manager write" on mistakes for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

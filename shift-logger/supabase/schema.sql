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

drop policy if exists "actions read"                  on actions;
drop policy if exists "actions insert"                on actions;
drop policy if exists "actions update while report open" on actions;
create policy "actions read"   on actions for select using (true);
create policy "actions insert" on actions for insert with check (true);
create policy "actions update while report open" on actions for update using (
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
drop policy if exists "security read"  on security_log;
drop policy if exists "security write" on security_log;
create policy "security read"  on security_log for select using (true);
create policy "security write" on security_log for insert with check (true);

-- ── App settings (key/value) ──
-- Holds the work-area geofence ({enabled, lat, lng, radiusM, label}) under the
-- key 'geofence', set from the CEO console and enforced on every device.
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

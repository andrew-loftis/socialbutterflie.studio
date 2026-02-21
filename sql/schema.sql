create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  email text not null unique,
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  name text not null,
  color text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create table if not exists connections (
  user_id text not null,
  provider text not null,
  label text,
  access_token text,
  refresh_token text,
  expires_at bigint,
  page_id text,
  page_token text,
  ig_user_id text,
  target_id text,
  target_name text,
  extra jsonb,
  org_id uuid references orgs(id),
  primary key (user_id, provider)
);

create table if not exists prefs (
  user_id text primary key,
  data jsonb,
  org_id uuid references orgs(id)
);

create table if not exists scheduled (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider text not null,
  caption text,
  media_url text,
  scheduled_at timestamptz not null,
  status text not null default 'pending',
  external_id text,
  org_id uuid references orgs(id),
  campaign_id uuid references campaigns(id),
  retry_count int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table connections add column if not exists org_id uuid references orgs(id);
alter table prefs add column if not exists org_id uuid references orgs(id);
alter table scheduled add column if not exists org_id uuid references orgs(id);
alter table scheduled add column if not exists campaign_id uuid references campaigns(id);
alter table scheduled add column if not exists retry_count int not null default 0;
alter table scheduled add column if not exists last_error text;
alter table scheduled add column if not exists created_at timestamptz not null default now();
alter table scheduled add column if not exists updated_at timestamptz not null default now();
alter table scheduled add column if not exists processing_started_at timestamptz;
alter table scheduled add column if not exists lock_token text;
alter table scheduled add column if not exists last_idempotency_key text;
alter table scheduled add column if not exists approval_status text not null default 'approved';
alter table scheduled add column if not exists approved_by text;
alter table scheduled add column if not exists approved_at timestamptz;
alter table scheduled add column if not exists review_notes text;

create index if not exists idx_scheduled_due on scheduled(user_id, status, scheduled_at);
create index if not exists idx_scheduled_processing_started_at on scheduled(status, processing_started_at);
create index if not exists idx_scheduled_approval_status on scheduled(user_id, approval_status, scheduled_at);

create table if not exists scheduled_log (
  id bigserial primary key,
  scheduled_id uuid references scheduled(id) on delete cascade,
  org_id uuid references orgs(id),
  status text not null,
  idempotency_key text,
  external_id text,
  error text,
  attempt int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  org_id uuid not null references orgs(id) on delete cascade,
  user_id text not null,
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists idx_workspace_members_org_role on workspace_members(org_id, role);

alter table scheduled_log add column if not exists idempotency_key text;
create index if not exists idx_scheduled_log_org_created_at on scheduled_log(org_id, created_at desc);

create table if not exists audit_log (
  id bigserial primary key,
  org_id uuid references orgs(id),
  user_id text,
  action text not null,
  entity_type text,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_org_created_at on audit_log(org_id, created_at desc);

create unique index if not exists idx_orgs_name_unique on orgs(lower(name));

-- Account Groups: companies, clients, personal brands
create table if not exists account_groups (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  org_id uuid references orgs(id),
  name text not null,
  type text not null default 'company' check (type in ('company','personal')),
  color text,
  meta jsonb,
  brand_voice jsonb,
  created_at timestamptz not null default now()
);

-- Add brand_voice column if it doesn't exist
alter table account_groups add column if not exists brand_voice jsonb;

-- Update connections to support multiple per provider via unique id and link to account group
alter table connections drop constraint if exists connections_pkey;
alter table connections add column if not exists id uuid default gen_random_uuid();
alter table connections add column if not exists account_group_id uuid references account_groups(id) on delete set null;
alter table connections add column if not exists account_type text;
alter table connections add primary key (id);
create index if not exists idx_connections_user_provider on connections(user_id, provider);

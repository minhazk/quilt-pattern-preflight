-- Quilt Pattern Preflight: Neon-backed paid validation pilot
-- All public tables have RLS enabled. Customer document content is never stored
-- in analytics or ordinary application logs.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anonymous, authenticated;
grant usage on schema private to neondb_owner;

create table private.rate_limit_windows (
  bucket_hash text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

create type public.app_role as enum ('customer', 'operator', 'admin');
create type public.project_status as enum (
  'draft',
  'awaiting_payment',
  'ready_for_upload',
  'extracting',
  'awaiting_customer_confirmation',
  'ready_for_preflight',
  'processing',
  'awaiting_operator_review',
  'clarification_requested',
  'report_ready',
  'revision_available',
  'revision_processing',
  'completed',
  'cancelled',
  'failed'
);
create type public.review_status as enum (
  'not_started',
  'in_progress',
  'clarification_requested',
  'approved',
  'released'
);
create type public.finding_status as enum (
  'automated',
  'operator_approved',
  'operator_edited',
  'operator_suppressed',
  'manual',
  'customer_accepted',
  'customer_disputed',
  'resolved_in_revision'
);
create type public.finding_severity as enum (
  'critical',
  'warning',
  'review',
  'information'
);
create type public.job_status as enum (
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled'
);
create type public.credit_reason as enum (
  'purchase',
  'project_consumption',
  'refund',
  'complimentary',
  'operator_adjustment'
);
create type public.payment_status as enum (
  'pending',
  'paid',
  'refunded',
  'partially_refunded',
  'failed'
);
create type public.acquisition_source_type as enum (
  'direct_email',
  'instagram',
  'facebook_group',
  'reddit',
  'designer_directory',
  'technical_editor_referral',
  'other'
);

create table public.profiles (
  id uuid primary key references neon_auth.user(id) on delete cascade,
  email text not null,
  display_name text,
  role public.app_role not null default 'customer',
  retention_days integer not null default 30 check (retention_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.create_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.name, '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end
$$;

create trigger neon_auth_user_created_profile
after insert or update of email on neon_auth.user
for each row execute function private.create_customer_profile();

create table public.acquisition_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references neon_auth.user(id) on delete cascade,
  source public.acquisition_source_type not null,
  detail text check (char_length(detail) <= 500),
  qualified_prospect boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references neon_auth.user(id) on delete cascade,
  acquisition_source_id uuid references public.acquisition_sources(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  status public.project_status not null default 'draft',
  credit_consumed_at timestamptz,
  revision_deadline timestamptz,
  revision_used_at timestamptz,
  administrator_override boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version_number integer not null check (version_number between 1 and 2),
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  storage_path text not null unique,
  file_type text not null check (file_type in ('docx', 'pdf')),
  size_bytes bigint not null check (size_bytes between 1 and 15728640),
  mime_type text not null,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  raw_file bytea,
  page_count integer check (page_count > 0),
  text_layer_available boolean,
  confirmed_model jsonb,
  preflight_metadata jsonb,
  comparison_result jsonb,
  extraction_status public.job_status not null default 'queued',
  review_status public.review_status not null default 'not_started',
  raw_file_delete_after timestamptz not null,
  raw_file_deleted_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions(id) on delete cascade,
  storage_object_id uuid,
  validation_result jsonb not null default '{}'::jsonb,
  rejected_reason text,
  created_at timestamptz not null default now()
);

create table public.extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions(id) on delete cascade,
  idempotency_key text not null unique,
  status public.job_status not null default 'queued',
  parser_version text not null,
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  non_sensitive_error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.extracted_entities (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions(id) on delete cascade,
  entity_type text not null,
  raw_value text not null,
  normalized_value text not null,
  source_page integer check (source_page > 0),
  source_section text,
  source_excerpt text not null,
  source_bounding_box jsonb,
  extraction_method text not null,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  confirmation_status text not null default 'proposed'
    check (confirmation_status in ('proposed', 'confirmed', 'corrected', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.assumptions (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions(id) on delete cascade,
  version integer not null check (version > 0),
  values jsonb not null,
  confirmed_by uuid references neon_auth.user(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (document_version_id, version)
);

create table public.fabrics (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions(id) on delete cascade,
  name text not null,
  stated_requirement text,
  stated_requirement_source jsonb,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.pieces (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions(id) on delete cascade,
  fabric_id uuid references public.fabrics(id) on delete set null,
  name text not null,
  cut_width text,
  cut_height text,
  finished_width text,
  finished_height text,
  quantity_per_block integer check (quantity_per_block >= 0),
  stated_total_quantity integer check (stated_total_quantity >= 0),
  extra_quantity integer not null default 0 check (extra_quantity >= 0),
  source_references jsonb not null default '[]'::jsonb,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions(id) on delete cascade,
  name text not null,
  finished_width text,
  finished_height text,
  unfinished_width text,
  unfinished_height text,
  quantity integer check (quantity > 0),
  grid_rows integer check (grid_rows > 0),
  grid_columns integer check (grid_columns > 0),
  piece_relationships jsonb not null default '[]'::jsonb,
  source_references jsonb not null default '[]'::jsonb,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.sashings (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions(id) on delete cascade,
  width text,
  segment_lengths jsonb not null default '[]'::jsonb,
  quantities jsonb not null default '[]'::jsonb,
  source_references jsonb not null default '[]'::jsonb,
  confirmed boolean not null default false
);

create table public.borders (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions(id) on delete cascade,
  position text not null,
  cut_width text,
  finished_width text,
  segment_lengths jsonb not null default '[]'::jsonb,
  quantities jsonb not null default '[]'::jsonb,
  source_references jsonb not null default '[]'::jsonb,
  confirmed boolean not null default false
);

create table public.rule_versions (
  id text not null,
  version text not null,
  name text not null,
  description text not null,
  supported_constructions text[] not null default '{}',
  assumptions text[] not null default '{}',
  formula text not null,
  rationale text not null,
  known_limitations text[] not null default '{}',
  active boolean not null default true,
  added_at date not null default current_date,
  primary key (id, version)
);

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions(id) on delete cascade,
  rule_id text not null,
  rule_version text not null,
  severity public.finding_severity not null,
  category text not null,
  title text not null,
  explanation text not null,
  formula text not null,
  operands jsonb not null default '{}'::jsonb,
  expected_result text not null,
  stated_result text not null,
  difference text not null,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  assumptions_used jsonb not null default '[]'::jsonb,
  recommended_action text not null,
  limitation text,
  status public.finding_status not null default 'automated',
  automated_snapshot jsonb not null,
  operator_note text,
  customer_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (rule_id, rule_version)
    references public.rule_versions(id, version)
);

create table public.finding_sources (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.findings(id) on delete cascade,
  page integer check (page > 0),
  section text,
  excerpt text not null,
  bounding_box jsonb,
  created_at timestamptz not null default now()
);

create table public.operator_reviews (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null unique references public.document_versions(id) on delete cascade,
  reviewer_id uuid references neon_auth.user(id) on delete set null,
  status public.review_status not null default 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  automated_findings_count integer not null default 0 check (automated_findings_count >= 0),
  approved_findings_count integer not null default 0 check (approved_findings_count >= 0),
  suppressed_findings_count integer not null default 0 check (suppressed_findings_count >= 0),
  manual_findings_count integer not null default 0 check (manual_findings_count >= 0),
  notes text,
  processing_seconds integer check (processing_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operator_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references neon_auth.user(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  document_version_id uuid references public.document_versions(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

create table public.credits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references neon_auth.user(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  delta integer not null check (delta <> 0),
  reason public.credit_reason not null,
  payment_id uuid,
  note text,
  created_by uuid references neon_auth.user(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references neon_auth.user(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text unique,
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null check (currency = 'gbp'),
  credit_count integer not null check (credit_count in (1, 3)),
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.credits
  add constraint credits_payment_id_fkey
  foreign key (payment_id) references public.payments(id) on delete set null;

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  stripe_refund_id text not null unique,
  amount_minor integer not null check (amount_minor > 0),
  credits_reversed integer not null default 0 check (credits_reversed >= 0),
  reason text,
  created_at timestamptz not null default now()
);

create table public.stripe_events (
  id text primary key,
  event_type text not null,
  livemode boolean not null,
  processed_at timestamptz not null default now()
);

create table public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references neon_auth.user(id) on delete cascade,
  issue_found boolean,
  minutes_saved integer check (minutes_saved between 0 and 1440),
  unhelpful_findings text,
  would_pay_again boolean,
  before_every_handoff boolean,
  currently_pays_editor boolean,
  needed_unsupported_construction text,
  benchmark_consent boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (project_id, owner_id)
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  owner_id uuid references neon_auth.user(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  anonymous_id uuid,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint analytics_no_document_content
    check (
      not (properties ?| array[
        'document_text',
        'source_excerpt',
        'filename',
        'extracted_value',
        'measurement'
      ])
    )
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references neon_auth.user(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  consent_type text not null,
  granted boolean not null,
  policy_version text not null,
  recorded_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references neon_auth.user(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  request_type text not null check (request_type in ('project', 'account', 'raw_file')),
  status public.job_status not null default 'queued',
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references neon_auth.user(id) on delete cascade,
  template text not null,
  payload jsonb not null,
  idempotency_key text not null unique,
  status public.job_status not null default 'queued',
  sent_at timestamptz,
  non_sensitive_error_code text,
  created_at timestamptz not null default now()
);

create index projects_owner_status_idx on public.projects(owner_id, status)
  where deleted_at is null;
create index document_versions_project_idx on public.document_versions(project_id, version_number);
create index document_versions_retention_idx on public.document_versions(raw_file_delete_after)
  where raw_file_deleted_at is null;
create index extraction_jobs_status_idx on public.extraction_jobs(status, created_at);
create index extracted_entities_document_idx on public.extracted_entities(document_version_id, entity_type);
create index findings_document_severity_idx on public.findings(document_version_id, severity, status);
create index operator_reviews_queue_idx on public.operator_reviews(status, created_at);
create index audit_project_created_idx on public.operator_audit_events(project_id, created_at desc);
create index credits_owner_created_idx on public.credits(owner_id, created_at);
create index payments_owner_created_idx on public.payments(owner_id, created_at);
create index analytics_event_time_idx on public.analytics_events(event_name, occurred_at);
create index feedback_pay_again_idx on public.customer_feedback(would_pay_again, submitted_at);

create or replace function private.enforce_document_storage_budget()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_bytes bigint;
  max_active_bytes constant bigint := 209715200;
begin
  if new.raw_file_deleted_at is null then
    if new.raw_file is null then
      raise exception 'raw_file_required' using errcode = '23514';
    end if;
    if octet_length(new.raw_file) <> new.size_bytes then
      raise exception 'raw_file_size_mismatch' using errcode = '23514';
    end if;
  elsif new.raw_file is not null then
    raise exception 'deleted_raw_file_must_be_empty' using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('document_storage_budget', 0));
  select coalesce(sum(octet_length(raw_file)), 0)
  into active_bytes
  from public.document_versions
  where raw_file_deleted_at is null
    and id <> new.id;

  if active_bytes + coalesce(octet_length(new.raw_file), 0) > max_active_bytes then
    raise exception 'free_storage_budget_exhausted' using errcode = '53100';
  end if;
  return new;
end
$$;

create trigger document_versions_enforce_storage_budget
before insert or update of raw_file, raw_file_deleted_at, size_bytes
on public.document_versions
for each row execute function private.enforce_document_storage_budget();

create or replace function private.current_user_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select nullif(auth.user_id(), '')::uuid
$$;

create or replace function private.is_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from neon_auth.user
    where id = private.current_user_id()
      and role in ('operator', 'admin')
  )
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from neon_auth.user
    where id = private.current_user_id()
      and role = 'admin'
  )
$$;

grant execute on function private.current_user_id() to authenticated;
grant execute on function private.is_operator() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant usage on schema private to authenticated;

create or replace function private.owns_project(target_project_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.projects
    where id = target_project_id
      and owner_id = private.current_user_id()
      and deleted_at is null
  )
$$;
grant execute on function private.owns_project(uuid) to authenticated;

create or replace function private.owns_document(target_document_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.document_versions d
    join public.projects p on p.id = d.project_id
    where d.id = target_document_id
      and p.owner_id = private.current_user_id()
      and p.deleted_at is null
  )
$$;
grant execute on function private.owns_document(uuid) to authenticated;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function private.touch_updated_at();
create trigger projects_touch_updated_at before update on public.projects
for each row execute function private.touch_updated_at();
create trigger findings_touch_updated_at before update on public.findings
for each row execute function private.touch_updated_at();
create trigger operator_reviews_touch_updated_at before update on public.operator_reviews
for each row execute function private.touch_updated_at();

create or replace function private.enforce_project_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = new.status then
    return new;
  end if;
  if not (
    (old.status = 'draft' and new.status in ('awaiting_payment', 'ready_for_upload', 'cancelled')) or
    (old.status = 'awaiting_payment' and new.status in ('ready_for_upload', 'cancelled', 'failed')) or
    (old.status = 'ready_for_upload' and new.status in ('extracting', 'cancelled')) or
    (old.status = 'extracting' and new.status in ('awaiting_customer_confirmation', 'failed', 'cancelled')) or
    (old.status = 'awaiting_customer_confirmation' and new.status in ('ready_for_preflight', 'extracting', 'cancelled')) or
    (old.status = 'ready_for_preflight' and new.status in ('processing', 'cancelled')) or
    (old.status = 'processing' and new.status in ('awaiting_operator_review', 'failed', 'cancelled')) or
    (old.status = 'awaiting_operator_review' and new.status in ('clarification_requested', 'report_ready', 'failed')) or
    (old.status = 'clarification_requested' and new.status in ('awaiting_customer_confirmation', 'cancelled')) or
    (old.status = 'report_ready' and new.status in ('revision_available', 'completed')) or
    (old.status = 'revision_available' and new.status in ('revision_processing', 'completed')) or
    (old.status = 'revision_processing' and new.status in ('awaiting_customer_confirmation', 'failed')) or
    (old.status = 'failed' and new.status in ('ready_for_upload', 'processing', 'cancelled'))
  ) then
    raise exception 'invalid_project_transition:%->%', old.status, new.status
      using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger projects_enforce_transition before update of status on public.projects
for each row execute function private.enforce_project_transition();

create or replace function private.audit_operator_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_document_id uuid;
  target_project_id uuid;
begin
  target_document_id := coalesce(new.document_version_id, old.document_version_id);
  select project_id into target_project_id
  from public.document_versions where id = target_document_id;

  insert into public.operator_audit_events (
    actor_id, project_id, document_version_id, action,
    entity_type, entity_id, before_value, after_value
  ) values (
    private.current_user_id(), target_project_id, target_document_id, tg_op,
    tg_table_name, coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  -- The return value of an AFTER trigger is ignored. Returning NULL also
  -- avoids trying to coalesce polymorphic records for DELETE operations.
  return null;
end
$$;

create trigger findings_operator_audit
after insert or update or delete on public.findings
for each row
when (private.is_operator())
execute function private.audit_operator_change();

create trigger reviews_operator_audit
after insert or update or delete on public.operator_reviews
for each row
when (private.is_operator())
execute function private.audit_operator_change();

create or replace function public.fulfill_stripe_checkout(
  p_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_owner_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_amount_minor integer,
  p_credit_count integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_payment_id uuid;
begin
  if p_credit_count not in (1, 3)
     or (p_credit_count = 1 and p_amount_minor <> 2000)
     or (p_credit_count = 3 and p_amount_minor <> 4900) then
    raise exception 'invalid_checkout_product' using errcode = '23514';
  end if;

  insert into public.stripe_events(id, event_type, livemode)
  values (p_event_id, p_event_type, p_livemode)
  on conflict (id) do nothing;
  if not found then
    return false;
  end if;

  insert into public.payments (
    owner_id, stripe_checkout_session_id, stripe_payment_intent_id,
    amount_minor, currency, credit_count, status, paid_at
  ) values (
    p_owner_id, p_checkout_session_id, nullif(p_payment_intent_id, ''),
    p_amount_minor, 'gbp', p_credit_count, 'paid', now()
  )
  returning id into created_payment_id;

  insert into public.credits (
    owner_id, delta, reason, payment_id, note
  ) values (
    p_owner_id, p_credit_count, 'purchase', created_payment_id,
    'Allocated by verified Stripe Checkout webhook'
  );

  return true;
end
$$;
revoke all on function public.fulfill_stripe_checkout(
  text, text, boolean, uuid, text, text, integer, integer
) from public, anonymous, authenticated;

create or replace function public.consume_project_credit(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_owner uuid := private.current_user_id();
  available_credits integer;
begin
  if requesting_owner is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  -- Serialize consumption per customer so two simultaneous submissions cannot
  -- spend the same remaining credit.
  perform pg_advisory_xact_lock(hashtextextended(requesting_owner::text, 0));

  if not exists (
    select 1 from public.projects
    where id = p_project_id
      and owner_id = requesting_owner
      and status = 'ready_for_preflight'
      and deleted_at is null
  ) then
    raise exception 'project_not_ready' using errcode = '23514';
  end if;

  select coalesce(sum(delta), 0)::integer
  into available_credits
  from public.credits
  where owner_id = requesting_owner;

  if available_credits < 1 then
    raise exception 'credit_required' using errcode = '23514';
  end if;

  insert into public.credits (owner_id, project_id, delta, reason, note)
  values (
    requesting_owner, p_project_id, -1, 'project_consumption',
    'Consumed atomically when the confirmed model entered preflight'
  );

  update public.projects
  set status = 'processing', credit_consumed_at = now()
  where id = p_project_id;

  return available_credits - 1;
end
$$;
revoke all on function public.consume_project_credit(uuid) from public, anonymous;
grant execute on function public.consume_project_credit(uuid) to authenticated;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  hashed_key text;
  current_window private.rate_limit_windows%rowtype;
begin
  if char_length(p_key) < 3 or p_limit not between 1 and 1000 or
     p_window_seconds not between 1 and 86400 then
    raise exception 'invalid_rate_limit_parameters' using errcode = '22023';
  end if;
  hashed_key := encode(extensions.digest(p_key, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(hashed_key, 0));
  select * into current_window
  from private.rate_limit_windows
  where bucket_hash = hashed_key;

  if not found or
     current_window.window_started_at <=
       now() - make_interval(secs => p_window_seconds) then
    insert into private.rate_limit_windows (
      bucket_hash, window_started_at, request_count
    ) values (hashed_key, now(), 1)
    on conflict (bucket_hash) do update set
      window_started_at = excluded.window_started_at,
      request_count = 1;
    return true;
  end if;

  if current_window.request_count >= p_limit then
    return false;
  end if;
  update private.rate_limit_windows
  set request_count = request_count + 1
  where bucket_hash = hashed_key;
  return true;
end
$$;
revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer)
  to anonymous, authenticated;

create or replace view public.credit_balances
with (security_invoker = true)
as
select owner_id, coalesce(sum(delta), 0)::integer as balance
from public.credits
group by owner_id;

create or replace view public.validation_funnel
with (security_invoker = true)
as
select
  event_name,
  count(*) as event_count,
  count(distinct owner_id) filter (where owner_id is not null) as known_users,
  min(occurred_at) as first_seen,
  max(occurred_at) as last_seen
from public.analytics_events
group by event_name;

alter table public.profiles enable row level security;
alter table public.acquisition_sources enable row level security;
alter table public.projects enable row level security;
alter table public.document_versions enable row level security;
alter table public.uploads enable row level security;
alter table public.extraction_jobs enable row level security;
alter table public.extracted_entities enable row level security;
alter table public.assumptions enable row level security;
alter table public.fabrics enable row level security;
alter table public.pieces enable row level security;
alter table public.blocks enable row level security;
alter table public.sashings enable row level security;
alter table public.borders enable row level security;
alter table public.rule_versions enable row level security;
alter table public.findings enable row level security;
alter table public.finding_sources enable row level security;
alter table public.operator_reviews enable row level security;
alter table public.operator_audit_events enable row level security;
alter table public.credits enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.stripe_events enable row level security;
alter table public.customer_feedback enable row level security;
alter table public.analytics_events enable row level security;
alter table public.consent_records enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.email_outbox enable row level security;

create policy profiles_read_own on public.profiles for select to authenticated
using (private.current_user_id() = id or private.is_operator());
create policy profiles_update_own on public.profiles for update to authenticated
using (private.current_user_id() = id)
with check (private.current_user_id() = id and role = 'customer');

create policy acquisition_owner_all on public.acquisition_sources for all to authenticated
using (private.current_user_id() = owner_id or private.is_operator())
with check (private.current_user_id() = owner_id or private.is_operator());

create policy projects_read on public.projects for select to authenticated
using ((private.current_user_id() = owner_id and deleted_at is null) or private.is_operator());
create policy projects_insert on public.projects for insert to authenticated
with check (private.current_user_id() = owner_id);
create policy projects_update on public.projects for update to authenticated
using ((private.current_user_id() = owner_id and deleted_at is null) or private.is_operator())
with check (private.current_user_id() = owner_id or private.is_operator());

create policy documents_read on public.document_versions for select to authenticated
using (private.owns_project(project_id) or private.is_operator());
create policy documents_insert on public.document_versions for insert to authenticated
with check (private.owns_project(project_id));
create policy documents_update on public.document_versions for update to authenticated
using (private.owns_project(project_id) or private.is_operator())
with check (private.owns_project(project_id) or private.is_operator());

create policy uploads_read on public.uploads for select to authenticated
using (private.owns_document(document_version_id) or private.is_operator());
create policy uploads_owner_insert on public.uploads for insert to authenticated
with check (private.owns_document(document_version_id) or private.is_operator());

create policy jobs_read on public.extraction_jobs for select to authenticated
using (private.owns_document(document_version_id) or private.is_operator());
create policy jobs_owner_insert on public.extraction_jobs for insert to authenticated
with check (private.owns_document(document_version_id) or private.is_operator());

create policy entities_read on public.extracted_entities for select to authenticated
using (private.owns_document(document_version_id) or private.is_operator());
create policy entities_confirm on public.extracted_entities for update to authenticated
using (private.owns_document(document_version_id) or private.is_operator())
with check (private.owns_document(document_version_id) or private.is_operator());
create policy entities_owner_insert on public.extracted_entities for insert to authenticated
with check (private.owns_document(document_version_id) or private.is_operator());

create policy assumptions_read on public.assumptions for select to authenticated
using (private.owns_document(document_version_id) or private.is_operator());
create policy assumptions_write on public.assumptions for insert to authenticated
with check (private.owns_document(document_version_id) or private.is_operator());

create policy fabrics_owner_all on public.fabrics for all to authenticated
using (private.owns_document(document_version_id) or private.is_operator())
with check (private.owns_document(document_version_id) or private.is_operator());
create policy pieces_owner_all on public.pieces for all to authenticated
using (private.owns_document(document_version_id) or private.is_operator())
with check (private.owns_document(document_version_id) or private.is_operator());
create policy blocks_owner_all on public.blocks for all to authenticated
using (private.owns_document(document_version_id) or private.is_operator())
with check (private.owns_document(document_version_id) or private.is_operator());
create policy sashings_owner_all on public.sashings for all to authenticated
using (private.owns_document(document_version_id) or private.is_operator())
with check (private.owns_document(document_version_id) or private.is_operator());
create policy borders_owner_all on public.borders for all to authenticated
using (private.owns_document(document_version_id) or private.is_operator())
with check (private.owns_document(document_version_id) or private.is_operator());

create policy rules_authenticated_read on public.rule_versions for select to authenticated
using (active or private.is_operator());

create policy findings_read on public.findings for select to authenticated
using (
  private.owns_document(document_version_id)
  and status <> 'operator_suppressed'
  or private.is_operator()
);
create policy findings_customer_feedback on public.findings for update to authenticated
using (private.owns_document(document_version_id))
with check (
  private.owns_document(document_version_id)
  and status in ('customer_accepted', 'customer_disputed')
);
create policy findings_owner_automated_insert on public.findings for insert to authenticated
with check (
  private.owns_document(document_version_id)
  and status = 'automated'
);
create policy findings_operator_all on public.findings for all to authenticated
using (private.is_operator()) with check (private.is_operator());

create policy finding_sources_read on public.finding_sources for select to authenticated
using (
  exists (
    select 1 from public.findings f
    where f.id = finding_id
      and (private.owns_document(f.document_version_id) or private.is_operator())
      and (f.status <> 'operator_suppressed' or private.is_operator())
  )
);
create policy finding_sources_operator_write on public.finding_sources for all to authenticated
using (private.is_operator()) with check (private.is_operator());
create policy finding_sources_owner_insert on public.finding_sources for insert to authenticated
with check (
  exists (
    select 1
    from public.findings f
    where f.id = finding_id
      and private.owns_document(f.document_version_id)
      and f.status = 'automated'
  )
);

create policy reviews_customer_read on public.operator_reviews for select to authenticated
using (
  (private.owns_document(document_version_id) and status in ('approved', 'released'))
  or private.is_operator()
);
create policy reviews_operator_all on public.operator_reviews for all to authenticated
using (private.is_operator()) with check (private.is_operator());
create policy reviews_owner_insert on public.operator_reviews for insert to authenticated
with check (
  private.owns_document(document_version_id)
  and status = 'not_started'
);

create policy audit_operator_read on public.operator_audit_events for select to authenticated
using (private.is_operator());
create policy audit_operator_insert on public.operator_audit_events for insert to authenticated
with check (private.is_operator() and actor_id = private.current_user_id());

create policy credits_read_own on public.credits for select to authenticated
using (private.current_user_id() = owner_id or private.is_operator());
create policy payments_read_own on public.payments for select to authenticated
using (private.current_user_id() = owner_id or private.is_operator());
create policy refunds_read on public.refunds for select to authenticated
using (
  exists (
    select 1 from public.payments p
    where p.id = payment_id
      and (p.owner_id = private.current_user_id() or private.is_operator())
  )
);

create policy feedback_owner_all on public.customer_feedback for all to authenticated
using (private.current_user_id() = owner_id or private.is_operator())
with check (private.current_user_id() = owner_id);

create policy analytics_insert on public.analytics_events for insert to anonymous, authenticated
with check (owner_id is null or owner_id = private.current_user_id());
create policy analytics_operator_read on public.analytics_events for select to authenticated
using (private.is_operator());

create policy consent_owner_all on public.consent_records for all to authenticated
using (private.current_user_id() = owner_id or private.is_operator())
with check (private.current_user_id() = owner_id);
create policy deletion_owner_all on public.deletion_requests for all to authenticated
using (private.current_user_id() = owner_id or private.is_operator())
with check (private.current_user_id() = owner_id);
create policy outbox_operator_read on public.email_outbox for select to authenticated
using (private.is_operator());
create policy outbox_owner_insert on public.email_outbox for insert to authenticated
with check (private.current_user_id() = owner_id);

grant usage on schema public to anonymous, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant insert on public.analytics_events to anonymous;
grant usage, select on all sequences in schema public to authenticated;

insert into public.rule_versions (
  id, version, name, description, supported_constructions,
  assumptions, formula, rationale, known_limitations
) values
  (
    'DATA_CONSISTENCY', '1.0.0', 'Document and data consistency',
    'Flags conflicting or incomplete confirmed entities.',
    array['confirmed squares', 'confirmed rectangles', 'confirmed strips'],
    array['customer-confirmed entity names'],
    'Compare normalized values for the same confirmed entity',
    'Conflicting confirmed values require human resolution.',
    array['Does not infer whether similarly named pieces are actually identical']
  ),
  (
    'PIECE_COUNT_RECONCILIATION', '1.0.0', 'Piece-count reconciliation',
    'Reconciles confirmed per-block quantities with confirmed block totals.',
    array['repeated identical blocks'],
    array['block quantity confirmed', 'deliberate extras confirmed'],
    '(quantity per block × block quantity) + deliberate extras',
    'Exact integer reconciliation within the confirmed model.',
    array['Not run where piece-to-block mapping is ambiguous']
  ),
  (
    'FINISHED_UNFINISHED_RELATIONSHIP', '1.0.0', 'Finished and unfinished dimensions',
    'Checks explicitly declared straight-seam relationships.',
    array['straight seams'],
    array['relationship confirmed', 'seam allowance confirmed'],
    'finished dimension + (2 × seam allowance)',
    'A straight seam adds one seam allowance on each side.',
    array['Not valid for trimmed units or unsupported construction']
  ),
  (
    'STRIP_YIELD', '1.0.0', 'WOF strip yield',
    'Checks confirmed subcut yield and required strip count.',
    array['straight WOF strip subcutting'],
    array['orientation confirmed', 'usable WOF confirmed'],
    'floor(usable WOF ÷ subcut length); ceil(quantity ÷ yield)',
    'Exact yield arithmetic for confirmed straight subcuts.',
    array['No directional-print, nesting, fussy-cutting or shrinkage optimisation']
  ),
  (
    'FABRIC_REQUIREMENT', '1.0.0', 'Fabric requirement',
    'Compares confirmed strip use with rounded stated yardage.',
    array['confirmed WOF strips'],
    array['strip count confirmed', 'rounding increment confirmed'],
    '(strips × cut width + allowance) ÷ 36, rounded upward',
    'Converts confirmed strip length to yardage exactly.',
    array['No unsupported nesting, nap, shrinkage or unconfirmed waste']
  ),
  (
    'GRID_DIMENSIONS', '1.0.0', 'Simple grid dimensions',
    'Rebuilds a simple rectangular layout from confirmed inputs.',
    array['rectangular block grids', 'straight sashing', 'straight borders'],
    array['rows, columns, block size and additions confirmed'],
    '(columns × width) + sashing + borders; (rows × height) + sashing + borders',
    'Exact rectangular layout arithmetic.',
    array['No on-point layouts or inferred sashing/border construction']
  ),
  (
    'COMPLETENESS', '1.0.0', 'Confirmed-model completeness',
    'Flags confirmed uses without a matching confirmed cutting entity.',
    array['confirmed block piece mappings'],
    array['piece-name mapping confirmed'],
    'assembly piece names − cutting piece names',
    'A confirmed assembly reference should have a confirmed source instruction.',
    array['May indicate unsupported scope rather than a source error']
  ),
  (
    'UNSUPPORTED_CONSTRUCTION', '1.0.0', 'Unsupported construction marker',
    'Directs excluded construction to manual review without a calculation.',
    array[]::text[],
    array['construction flag confirmed or suspected'],
    'No calculation run',
    'The safe result for excluded scope is no inferred result.',
    array['Informational only']
  ),
  (
    'OPERATOR_MANUAL_REVIEW', '1.0.0', 'Operator manual review',
    'Records a source-linked issue identified during disclosed beta quality control.',
    array['operator-reviewed supported scope'],
    array['operator reviewed the cited source and confirmed the issue'],
    'Operator-declared issue; no automated formula',
    'Some document contradictions require an explicit human source review.',
    array['Manual findings are not evidence of automated-rule precision']
  );

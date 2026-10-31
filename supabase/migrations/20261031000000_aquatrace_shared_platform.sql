-- Unapplied setup migration. Review before running against a Supabase project.
-- Authenticated users can report and read incidents. Review decisions are
-- written only through role-checked functions so status history is atomic.

create type public.aquatrace_role as enum ('resident', 'reviewer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  email text not null,
  role public.aquatrace_role not null default 'resident',
  created_at timestamptz not null default now()
);

create table public.profile_role_history (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  previous_role public.aquatrace_role,
  new_role public.aquatrace_role not null,
  changed_by uuid references public.profiles (id) on delete set null,
  explanation text not null check (length(trim(explanation)) between 1 and 500),
  created_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  public_id text generated always as (
    'AT-' || upper(substr(replace(id::text, '-', ''), 1, 10))
  ) stored unique,
  reporter_id uuid not null references public.profiles (id) on delete restrict,
  area text not null check (length(trim(area)) between 1 and 100),
  municipality text check (municipality is null or length(trim(municipality)) <= 120),
  category text not null check (category in ('Water outage', 'Low water pressure', 'Water quality concern', 'Other')),
  severity text not null check (severity in ('High', 'Medium', 'Low')),
  description text not null check (length(trim(description)) between 1 and 1000),
  observed_at timestamptz not null,
  reported_at timestamptz not null default now(),
  status text not null default 'unverified'
    check (status in ('unverified', 'under_review', 'needs_information', 'confirmed', 'resolved', 'rejected')),
  verification_classification text not null default 'unverified'
    check (verification_classification in ('unverified', 'reviewed', 'corroborated', 'externally_verified')),
  evidence_url text check (evidence_url is null or evidence_url ~ '^https://'),
  last_updated_at timestamptz not null default now(),
  submission_key uuid not null unique,
  legacy_source_id text unique,
  legacy_reported_label text check (legacy_reported_label is null or length(legacy_reported_label) <= 100),
  legacy_reported_at timestamptz,
  legacy_reporter_label text check (legacy_reporter_label is null or length(legacy_reporter_label) <= 140),
  constraint incident_evidence_for_verified_classification check (
    verification_classification not in ('corroborated', 'externally_verified')
    or evidence_url is not null
  )
);

create table public.incident_status_history (
  id bigint generated always as identity primary key,
  incident_id uuid not null references public.incidents (id) on delete restrict,
  previous_status text check (
    previous_status is null or previous_status in ('unverified', 'under_review', 'needs_information', 'confirmed', 'resolved', 'rejected')
  ),
  new_status text not null
    check (new_status in ('unverified', 'under_review', 'needs_information', 'confirmed', 'resolved', 'rejected')),
  previous_verification_classification text check (
    previous_verification_classification is null
    or previous_verification_classification in ('unverified', 'reviewed', 'corroborated', 'externally_verified')
  ),
  new_verification_classification text not null
    check (new_verification_classification in ('unverified', 'reviewed', 'corroborated', 'externally_verified')),
  updated_by uuid references public.profiles (id) on delete set null,
  explanation text not null check (length(trim(explanation)) between 1 and 1000),
  evidence_url text check (evidence_url is null or evidence_url ~ '^https://'),
  created_at timestamptz not null default now()
);

create table public.water_points (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  physical_location text not null check (length(trim(physical_location)) between 1 and 300),
  municipality text not null check (length(trim(municipality)) between 1 and 120),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  constraint water_point_coordinates_pair check ((latitude is null) = (longitude is null)),
  water_point_type text not null check (length(trim(water_point_type)) between 1 and 80),
  data_source text not null check (length(trim(data_source)) between 1 and 200),
  data_source_url text not null check (data_source_url ~ '^https://'),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'under_review', 'verified', 'closed_or_removed')),
  last_verification_date timestamptz,
  availability_status text not null default 'unknown'
    check (availability_status in ('available', 'temporarily_unavailable', 'unknown', 'closed_or_removed')),
  last_availability_update timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.water_point_verification_history (
  id bigint generated always as identity primary key,
  water_point_id uuid not null references public.water_points (id) on delete restrict,
  previous_verification_status text check (
    previous_verification_status is null
    or previous_verification_status in ('unverified', 'under_review', 'verified', 'closed_or_removed')
  ),
  new_verification_status text not null
    check (new_verification_status in ('unverified', 'under_review', 'verified', 'closed_or_removed')),
  previous_availability_status text check (
    previous_availability_status is null
    or previous_availability_status in ('available', 'temporarily_unavailable', 'unknown', 'closed_or_removed')
  ),
  new_availability_status text not null
    check (new_availability_status in ('available', 'temporarily_unavailable', 'unknown', 'closed_or_removed')),
  reviewer_id uuid references public.profiles (id) on delete set null,
  evidence_or_explanation text not null check (length(trim(evidence_or_explanation)) between 1 and 1000),
  evidence_url text check (evidence_url is null or evidence_url ~ '^https://'),
  created_at timestamptz not null default now()
);

create index incidents_reporter_reported_idx on public.incidents (reporter_id, reported_at desc);
create index incidents_status_reported_idx on public.incidents (status, reported_at desc);
create index incidents_municipality_reported_idx on public.incidents (municipality, reported_at desc);
create index incident_history_incident_created_idx on public.incident_status_history (incident_id, created_at);
create index water_points_municipality_status_idx on public.water_points (municipality, verification_status, availability_status);
create index water_point_history_point_created_idx on public.water_point_verification_history (water_point_id, created_at);

create function public.has_aquatrace_role(required_role public.aquatrace_role)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = required_role
  );
$$;

create function public.is_aquatrace_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('reviewer', 'admin')
  );
$$;

create function public.create_aquatrace_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'AquaTrace resident'),
    new.email
  );
  insert into public.profile_role_history (
    profile_id, previous_role, new_role, changed_by, explanation
  )
  values (
    new.id, null, 'resident', null, 'Default resident role assigned when the account was created.'
  );
  return new;
end;
$$;

create trigger on_auth_user_created_aquatrace_profile
after insert on auth.users
for each row execute function public.create_aquatrace_profile();

alter table public.profiles enable row level security;
alter table public.profile_role_history enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_status_history enable row level security;
alter table public.water_points enable row level security;
alter table public.water_point_verification_history enable row level security;

create policy "Profiles are visible to their owner and admins"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.has_aquatrace_role('admin'));

create policy "Role history is visible to admins"
on public.profile_role_history for select to authenticated
using (public.has_aquatrace_role('admin'));

create policy "Authenticated users can read shared incidents"
on public.incidents for select to authenticated
using (true);

create policy "Residents can submit their own unverified incidents"
on public.incidents for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and status = 'unverified'
  and verification_classification = 'unverified'
  and evidence_url is null
);

create policy "Authenticated users can read incident status history"
on public.incident_status_history for select to authenticated
using (true);

create policy "Authenticated users can read water point records"
on public.water_points for select to authenticated
using (true);

create policy "Authenticated users can read water point verification history"
on public.water_point_verification_history for select to authenticated
using (true);

revoke all on public.profiles, public.profile_role_history, public.incidents,
  public.incident_status_history, public.water_points,
  public.water_point_verification_history from anon, authenticated;

grant select on public.profiles, public.profile_role_history,
  public.incidents, public.incident_status_history, public.water_points,
  public.water_point_verification_history to authenticated;

grant insert (reporter_id, area, municipality, category, severity, description, observed_at, submission_key)
  on public.incidents to authenticated;

create function public.review_incident(
  target_incident_id uuid,
  next_status text,
  next_verification_classification text,
  explanation text,
  evidence_url text default null
)
returns public.incidents
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_incident public.incidents;
  updated_incident public.incidents;
begin
  if not public.is_aquatrace_reviewer() then
    raise exception 'Reviewer or administrator role required.' using errcode = '42501';
  end if;
  if next_status not in ('unverified', 'under_review', 'needs_information', 'confirmed', 'resolved', 'rejected') then
    raise exception 'Unsupported incident status.' using errcode = '22023';
  end if;
  if next_verification_classification not in ('unverified', 'reviewed', 'corroborated', 'externally_verified') then
    raise exception 'Unsupported verification classification.' using errcode = '22023';
  end if;
  if length(trim(coalesce(explanation, ''))) not between 1 and 1000 then
    raise exception 'An explanation between 1 and 1000 characters is required.' using errcode = '22023';
  end if;
  if next_verification_classification in ('corroborated', 'externally_verified')
     and coalesce(evidence_url, '') !~ '^https://' then
    raise exception 'A public HTTPS evidence URL is required for this verification classification.' using errcode = '22023';
  end if;

  select * into current_incident
  from public.incidents
  where id = target_incident_id
  for update;
  if not found then
    raise exception 'Incident not found.' using errcode = 'P0002';
  end if;
  if current_incident.status = next_status
     and current_incident.verification_classification = next_verification_classification
     and current_incident.evidence_url is not distinct from evidence_url then
    raise exception 'No incident changes were supplied.' using errcode = '22023';
  end if;

  update public.incidents
  set status = next_status,
      verification_classification = next_verification_classification,
      evidence_url = nullif(trim(evidence_url), ''),
      last_updated_at = now()
  where id = target_incident_id
  returning * into updated_incident;

  insert into public.incident_status_history (
    incident_id, previous_status, new_status,
    previous_verification_classification, new_verification_classification,
    updated_by, explanation, evidence_url
  )
  values (
    target_incident_id, current_incident.status, updated_incident.status,
    current_incident.verification_classification, updated_incident.verification_classification,
    (select auth.uid()), trim(explanation), nullif(trim(evidence_url), '')
  );

  return updated_incident;
end;
$$;

create function public.import_legacy_incident(
  legacy_id text,
  incident_area text,
  incident_municipality text,
  incident_category text,
  incident_severity text,
  incident_description text,
  incident_observed_at timestamptz,
  source_reported_label text,
  source_reported_at timestamptz,
  source_reporter_label text,
  request_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  imported_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign-in required.' using errcode = '42501';
  end if;
  if length(trim(coalesce(legacy_id, ''))) not between 1 and 100 then
    raise exception 'A valid local report identifier is required.' using errcode = '22023';
  end if;
  if incident_observed_at > now() then
    raise exception 'Observation time cannot be in the future.' using errcode = '22023';
  end if;

  insert into public.incidents (
    reporter_id, area, municipality, category, severity, description,
    observed_at, status, verification_classification,
    submission_key, legacy_source_id, legacy_reported_label,
    legacy_reported_at, legacy_reporter_label
  )
  values (
    (select auth.uid()), trim(incident_area), nullif(trim(incident_municipality), ''),
    incident_category, incident_severity, trim(incident_description),
    incident_observed_at, 'unverified', 'unverified',
    request_key, legacy_id, left(source_reported_label, 100),
    source_reported_at, left(source_reporter_label, 140)
  )
  on conflict (legacy_source_id) do nothing
  returning id into imported_id;

  if imported_id is null then
    select id into imported_id from public.incidents
    where legacy_source_id = legacy_id and reporter_id = (select auth.uid());
    if imported_id is null then
      raise exception 'This local report identifier is already linked to another account.' using errcode = '23505';
    end if;
  end if;

  return imported_id;
end;
$$;

create function public.add_water_point(
  point_name text,
  point_location text,
  point_municipality text,
  point_latitude double precision,
  point_longitude double precision,
  point_type text,
  source_name text,
  source_url text,
  explanation text
)
returns public.water_points
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_point public.water_points;
begin
  if not public.is_aquatrace_reviewer() then
    raise exception 'Reviewer or administrator role required.' using errcode = '42501';
  end if;
  if coalesce(source_url, '') !~ '^https://' then
    raise exception 'An original HTTPS source URL is required.' using errcode = '22023';
  end if;
  if length(trim(coalesce(explanation, ''))) not between 1 and 1000 then
    raise exception 'A source review explanation is required.' using errcode = '22023';
  end if;

  insert into public.water_points (
    name, physical_location, municipality, latitude, longitude, water_point_type,
    data_source, data_source_url, verification_status, availability_status, created_by
  )
  values (
    trim(point_name), trim(point_location), trim(point_municipality),
    point_latitude, point_longitude, trim(point_type), trim(source_name),
    trim(source_url), 'unverified', 'unknown', (select auth.uid())
  )
  returning * into new_point;

  insert into public.water_point_verification_history (
    water_point_id, previous_verification_status, new_verification_status,
    previous_availability_status, new_availability_status, reviewer_id,
    evidence_or_explanation, evidence_url
  )
  values (
    new_point.id, null, new_point.verification_status,
    null, new_point.availability_status, (select auth.uid()),
    trim(explanation), trim(source_url)
  );

  return new_point;
end;
$$;

create function public.update_water_point(
  target_water_point_id uuid,
  next_verification_status text,
  next_availability_status text,
  explanation text,
  evidence_url text default null
)
returns public.water_points
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_point public.water_points;
  updated_point public.water_points;
begin
  if not public.is_aquatrace_reviewer() then
    raise exception 'Reviewer or administrator role required.' using errcode = '42501';
  end if;
  if next_verification_status not in ('unverified', 'under_review', 'verified', 'closed_or_removed') then
    raise exception 'Unsupported verification status.' using errcode = '22023';
  end if;
  if next_availability_status not in ('available', 'temporarily_unavailable', 'unknown', 'closed_or_removed') then
    raise exception 'Unsupported availability status.' using errcode = '22023';
  end if;
  if length(trim(coalesce(explanation, ''))) not between 1 and 1000 then
    raise exception 'An explanation between 1 and 1000 characters is required.' using errcode = '22023';
  end if;
  if next_verification_status = 'verified' and coalesce(evidence_url, '') !~ '^https://' then
    raise exception 'A source URL is required to verify a location.' using errcode = '22023';
  end if;

  select * into current_point from public.water_points
  where id = target_water_point_id for update;
  if not found then
    raise exception 'Water point not found.' using errcode = 'P0002';
  end if;
  if current_point.verification_status = next_verification_status
     and current_point.availability_status = next_availability_status then
    raise exception 'Choose a different verification or availability status.' using errcode = '22023';
  end if;

  update public.water_points
  set verification_status = next_verification_status,
      last_verification_date = case
        when current_point.verification_status is distinct from next_verification_status then now()
        else current_point.last_verification_date
      end,
      availability_status = next_availability_status,
      last_availability_update = case
        when current_point.availability_status is distinct from next_availability_status then now()
        else current_point.last_availability_update
      end,
      updated_at = now()
  where id = target_water_point_id
  returning * into updated_point;

  insert into public.water_point_verification_history (
    water_point_id, previous_verification_status, new_verification_status,
    previous_availability_status, new_availability_status, reviewer_id,
    evidence_or_explanation, evidence_url
  )
  values (
    target_water_point_id, current_point.verification_status, updated_point.verification_status,
    current_point.availability_status, updated_point.availability_status,
    (select auth.uid()), trim(explanation), nullif(trim(evidence_url), '')
  );

  return updated_point;
end;
$$;

create function public.set_profile_role(
  target_profile_id uuid,
  next_role public.aquatrace_role,
  explanation text
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_profile public.profiles;
  updated_profile public.profiles;
  administrator_count integer;
begin
  if not public.has_aquatrace_role('admin') then
    raise exception 'Administrator role required.' using errcode = '42501';
  end if;
  if target_profile_id = (select auth.uid()) then
    raise exception 'Administrators cannot change their own role.' using errcode = '42501';
  end if;
  if length(trim(coalesce(explanation, ''))) not between 1 and 500 then
    raise exception 'A role-change explanation is required.' using errcode = '22023';
  end if;

  select * into current_profile from public.profiles
  where id = target_profile_id for update;
  if not found then
    raise exception 'Profile not found.' using errcode = 'P0002';
  end if;
  if current_profile.role = next_role then
    raise exception 'Profile already has the requested role.' using errcode = '22023';
  end if;
  if current_profile.role = 'admin' and next_role <> 'admin' then
    perform pg_advisory_xact_lock(hashtext('aquatrace-admin-role-change'));
    select count(*) into administrator_count
    from public.profiles where role = 'admin';
    if administrator_count <= 1 then
      raise exception 'The final administrator cannot be demoted.' using errcode = '42501';
    end if;
  end if;

  update public.profiles set role = next_role
  where id = target_profile_id
  returning * into updated_profile;

  insert into public.profile_role_history (
    profile_id, previous_role, new_role, changed_by, explanation
  )
  values (
    target_profile_id, current_profile.role, next_role, (select auth.uid()), trim(explanation)
  );

  return updated_profile;
end;
$$;

revoke all on function public.has_aquatrace_role(public.aquatrace_role) from public, anon;
revoke all on function public.is_aquatrace_reviewer() from public, anon;
revoke all on function public.create_aquatrace_profile() from public, anon, authenticated;
revoke all on function public.review_incident(uuid, text, text, text, text) from public, anon;
revoke all on function public.import_legacy_incident(text, text, text, text, text, text, timestamptz, text, timestamptz, text, uuid) from public, anon;
revoke all on function public.add_water_point(text, text, text, double precision, double precision, text, text, text, text) from public, anon;
revoke all on function public.update_water_point(uuid, text, text, text, text) from public, anon;
revoke all on function public.set_profile_role(uuid, public.aquatrace_role, text) from public, anon;

grant execute on function public.has_aquatrace_role(public.aquatrace_role) to authenticated;
grant execute on function public.is_aquatrace_reviewer() to authenticated;
grant execute on function public.review_incident(uuid, text, text, text, text) to authenticated;
grant execute on function public.import_legacy_incident(text, text, text, text, text, text, timestamptz, text, timestamptz, text, uuid) to authenticated;
grant execute on function public.add_water_point(text, text, text, double precision, double precision, text, text, text, text) to authenticated;
grant execute on function public.update_water_point(uuid, text, text, text, text) to authenticated;
grant execute on function public.set_profile_role(uuid, public.aquatrace_role, text) to authenticated;

-- First administrator bootstrap: create the intended person through Supabase
-- Auth, then replace the UUID below and run this DO block as the project owner.
-- It records the initial privileged grant; it is not callable by app users.
-- do $bootstrap$
-- declare
--   target_user_id uuid := 'REPLACE-WITH-USER-UUID';
--   prior_role public.aquatrace_role;
-- begin
--   update public.profiles set role = 'admin'
--   where id = target_user_id and role = 'resident'
--   returning 'resident'::public.aquatrace_role into prior_role;
--   if not found then
--     raise exception 'User profile not found or is not a resident; no administrator role was changed.';
--   end if;
--   insert into public.profile_role_history (
--     profile_id, previous_role, new_role, changed_by, explanation
--   ) values (
--     target_user_id, prior_role, 'admin', null, 'Initial administrator bootstrap by project owner.'
--   );
-- end;
-- $bootstrap$;

begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'a@example.test', '', now(),
    '{"provider":"email","providers":["email"],"role":"customer"}', '{}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'b@example.test', '', now(),
    '{"provider":"email","providers":["email"],"role":"customer"}', '{}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'operator@example.test', '', now(),
    '{"provider":"email","providers":["email"],"role":"operator"}', '{}',
    now(), now(), '', '', '', ''
  );

insert into public.projects (id, owner_id, title)
values
  (
    '10000000-1000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Owner A project'
  ),
  (
    '20000000-2000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'Owner B project'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"customer"}}',
  true
);

select results_eq(
  $$ select count(*) from public.projects $$,
  $$ values (1::bigint) $$,
  'a customer sees only their own project'
);

select lives_ok(
  $$
    insert into public.projects (owner_id, title)
    values ('10000000-0000-4000-8000-000000000001', 'A second project')
  $$,
  'a customer may create their own project'
);

select throws_ok(
  $$
    insert into public.projects (owner_id, title)
    values ('20000000-0000-4000-8000-000000000002', 'Cross-user insert')
  $$,
  '42501',
  null,
  'a customer cannot create a project for another owner'
);

select throws_ok(
  $$
    insert into public.credits (owner_id, delta, reason)
    values ('10000000-0000-4000-8000-000000000001', 99, 'complimentary')
  $$,
  '42501',
  null,
  'a customer cannot grant themselves credits'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"role":"operator"}}',
  true
);

select results_eq(
  $$ select count(*) from public.projects $$,
  $$ values (3::bigint) $$,
  'an app-metadata operator can see the review population'
);

select * from finish();
rollback;

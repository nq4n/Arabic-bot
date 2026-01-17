-- Add peer dialogue chat tables and completion tracking.

create table if not exists public.collaborative_activity_completions (
  id bigserial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id text not null,
  activity_kind text not null,
  completed_at timestamptz not null default now(),
  unique (student_id, topic_id, activity_kind)
);

alter table public.collaborative_activity_completions enable row level security;

create policy "Students can view own collaborative completions"
  on public.collaborative_activity_completions
  for select
  using (student_id = auth.uid());

create policy "Teachers can view collaborative completions"
  on public.collaborative_activity_completions
  for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('teacher', 'admin')
    )
  );

create policy "Students can insert own collaborative completions"
  on public.collaborative_activity_completions
  for insert
  with check (student_id = auth.uid());

create policy "Teachers can manage collaborative completions"
  on public.collaborative_activity_completions
  for delete
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('teacher', 'admin')
    )
  );

create table if not exists public.dialogue_peer_scenarios (
  id bigserial primary key,
  topic_id text not null,
  scenario_text text not null,
  role_a text not null,
  role_b text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.dialogue_peer_sessions (
  id bigserial primary key,
  topic_id text not null,
  scenario_text text not null,
  role_a text not null,
  role_b text not null,
  status text not null default 'active',
  conversation_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dialogue_peer_participants (
  id bigserial primary key,
  session_id bigint not null references public.dialogue_peer_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  joined_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists public.dialogue_peer_queue (
  id bigserial primary key,
  topic_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (topic_id, user_id)
);

create index if not exists dialogue_peer_sessions_topic_idx
  on public.dialogue_peer_sessions (topic_id);

create index if not exists dialogue_peer_participants_session_idx
  on public.dialogue_peer_participants (session_id);

create index if not exists dialogue_peer_participants_user_idx
  on public.dialogue_peer_participants (user_id);

create index if not exists dialogue_peer_queue_topic_idx
  on public.dialogue_peer_queue (topic_id);

alter table public.dialogue_peer_scenarios enable row level security;
alter table public.dialogue_peer_sessions enable row level security;
alter table public.dialogue_peer_participants enable row level security;
alter table public.dialogue_peer_queue enable row level security;

create policy "Dialogue scenarios viewable by authenticated"
  on public.dialogue_peer_scenarios
  for select
  using (auth.uid() is not null);

insert into public.dialogue_peer_scenarios (topic_id, scenario_text, role_a, role_b)
select 'dialogue-text', 'أعمل حوار بين معلم وطالبه', 'معلم', 'طالب'
where not exists (
  select 1
  from public.dialogue_peer_scenarios
  where topic_id = 'dialogue-text'
    and scenario_text = 'أعمل حوار بين معلم وطالبه'
);

create policy "Dialogue sessions viewable by participants"
  on public.dialogue_peer_sessions
  for select
  using (
    exists (
      select 1
      from public.dialogue_peer_participants participants
      where participants.session_id = dialogue_peer_sessions.id
        and participants.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('teacher', 'admin')
    )
  );

create policy "Dialogue participants viewable by members"
  on public.dialogue_peer_participants
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('teacher', 'admin')
    )
  );

create policy "Dialogue participants insert by self"
  on public.dialogue_peer_participants
  for insert
  with check (user_id = auth.uid());

create policy "Dialogue queue insert by self"
  on public.dialogue_peer_queue
  for insert
  with check (user_id = auth.uid());

create policy "Dialogue queue delete by self"
  on public.dialogue_peer_queue
  for delete
  using (user_id = auth.uid());

create or replace function public.start_dialogue_peer_session(_topic_id text)
returns table (session_id bigint, role text, scenario_text text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_session_id bigint;
  existing_role text;
  existing_scenario text;
  waiting_user uuid;
  scenario_role_a text;
  scenario_role_b text;
  assigned_role_self text;
  assigned_role_other text;
begin
  select s.id, p.role, s.scenario_text
    into existing_session_id, existing_role, existing_scenario
    from public.dialogue_peer_participants p
    join public.dialogue_peer_sessions s on s.id = p.session_id
   where p.user_id = auth.uid()
     and s.topic_id = _topic_id
     and s.status = 'active'
   order by s.id desc
   limit 1;

  if existing_session_id is not null then
    session_id := existing_session_id;
    role := existing_role;
    scenario_text := existing_scenario;
    status := 'active';
    return next;
    return;
  end if;

  delete from public.dialogue_peer_queue
   where topic_id = _topic_id
     and user_id = auth.uid();

  select user_id
    into waiting_user
    from public.dialogue_peer_queue
   where topic_id = _topic_id
     and user_id <> auth.uid()
   order by joined_at
   limit 1
   for update skip locked;

  if waiting_user is null then
    insert into public.dialogue_peer_queue (topic_id, user_id)
    values (_topic_id, auth.uid())
    on conflict do nothing;

    session_id := null;
    role := null;
    scenario_text := null;
    status := 'waiting';
    return next;
    return;
  end if;

  delete from public.dialogue_peer_queue
   where topic_id = _topic_id
     and user_id = waiting_user;

  select scenario_text, role_a, role_b
    into scenario_text, scenario_role_a, scenario_role_b
    from public.dialogue_peer_scenarios
   where topic_id = _topic_id
     and is_active = true
   order by random()
   limit 1;

  if scenario_text is null then
    scenario_text := 'أعمل حوار بين معلم وطالبته';
    scenario_role_a := 'معلم';
    scenario_role_b := 'طالبة';
  end if;

  if random() < 0.5 then
    assigned_role_self := scenario_role_a;
    assigned_role_other := scenario_role_b;
  else
    assigned_role_self := scenario_role_b;
    assigned_role_other := scenario_role_a;
  end if;

  insert into public.dialogue_peer_sessions (topic_id, scenario_text, role_a, role_b)
  values (_topic_id, scenario_text, scenario_role_a, scenario_role_b)
  returning id into session_id;

  insert into public.dialogue_peer_participants (session_id, user_id, role)
  values
    (session_id, auth.uid(), assigned_role_self),
    (session_id, waiting_user, assigned_role_other);

  role := assigned_role_self;
  status := 'matched';
  return next;
end;
$$;

create or replace function public.get_dialogue_peer_session(_topic_id text)
returns table (session_id bigint, role text, scenario_text text, status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  select s.id, p.role, s.scenario_text
    into session_id, role, scenario_text
    from public.dialogue_peer_participants p
    join public.dialogue_peer_sessions s on s.id = p.session_id
   where p.user_id = auth.uid()
     and s.topic_id = _topic_id
     and s.status = 'active'
   order by s.id desc
   limit 1;

  if session_id is null then
    status := 'none';
    return next;
    return;
  end if;

  status := 'active';
  return next;
end;
$$;

create or replace function public.append_dialogue_peer_message(
  _session_id bigint,
  _message jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.dialogue_peer_participants
    where session_id = _session_id
      and user_id = auth.uid()
  ) then
    raise exception 'not a participant';
  end if;

  update public.dialogue_peer_sessions
     set conversation_log = coalesce(conversation_log, '[]'::jsonb) || jsonb_build_array(_message),
         updated_at = now()
   where id = _session_id;

  if not found then
    raise exception 'session not found';
  end if;
end;
$$;

grant execute on function public.start_dialogue_peer_session(text) to authenticated;
grant execute on function public.get_dialogue_peer_session(text) to authenticated;
grant execute on function public.append_dialogue_peer_message(bigint, jsonb) to authenticated;

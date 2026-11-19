begin;

create schema if not exists golf_private;
revoke all on schema golf_private from public;
grant usage on schema golf_private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null check (length(btrim(full_name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create function golf_private.make_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,full_name)
  values(new.id,coalesce(nullif(left(btrim(new.raw_user_meta_data->>'full_name'),120),''),'Tournament administrator'));
  return new;
end $$;
revoke execute on function golf_private.make_profile() from public;
create trigger golf_make_profile after insert on auth.users for each row execute function golf_private.make_profile();
insert into public.profiles(id,full_name)
select id,coalesce(nullif(left(btrim(raw_user_meta_data->>'full_name'),120),''),'Tournament administrator') from auth.users;

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users,
  name text not null check (length(btrim(name)) between 1 and 150),
  description text,
  location text,
  logo_path text,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  timezone text not null default 'America/Chicago',
  tournament_code text not null unique default ('GOLF-' || upper(left(replace(gen_random_uuid()::text,'-',''),16))),
  scoring_format text not null default 'individual' check(scoring_format in ('individual','team_aggregate')),
  status text not null default 'scheduled' check(status in ('scheduled','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tournaments_owner_idx on public.tournaments(owner_id);

create table public.tournament_settings (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null unique references public.tournaments on delete cascade,
  number_of_holes integer not null default 18 check(number_of_holes in (9,18)),
  team_scoring_policy text not null default 'best_n' check(team_scoring_policy in ('best_n','all')),
  counting_players integer not null default 4 check(counting_players between 1 and 100),
  tie_breaking_policy text not null default 'shared_rank' check(tie_breaking_policy = 'shared_rank'),
  updated_at timestamptz not null default now()
);
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 150),
  description text,
  logo_path text,
  created_at timestamptz not null default now(),
  unique(tournament_id,id)
);
create unique index teams_normalized_name_idx on public.teams(tournament_id,lower(btrim(name)));
create table public.players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments on delete cascade,
  team_id uuid,
  full_name text not null check(length(btrim(full_name)) between 1 and 150),
  player_number text,
  handicap numeric(4,1) check(handicap between -20 and 54),
  notes text,
  status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tournament_id,id),
  foreign key(tournament_id,team_id) references public.teams(tournament_id,id)
);
create index players_team_idx on public.players(tournament_id,team_id);
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 150),
  location text,
  number_of_holes integer not null check(number_of_holes in (9,18)),
  course_rating numeric(4,1) check(course_rating between 20 and 99),
  slope_rating integer check(slope_rating between 55 and 155),
  unique(tournament_id,id)
);
create table public.course_holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses on delete cascade,
  hole_number integer not null check(hole_number between 1 and 18),
  par integer check(par between 3 and 6),
  yardage integer check(yardage > 0),
  unique(course_id,hole_number)
);
create table public.tournament_rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments on delete cascade,
  course_id uuid not null,
  round_number integer not null check(round_number > 0),
  name text not null check(length(btrim(name)) between 1 and 150),
  start_time timestamptz not null,
  status text not null default 'scheduled' check(status in ('scheduled','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  unique(tournament_id,id),
  unique(tournament_id,round_number),
  foreign key(tournament_id,course_id) references public.courses(tournament_id,id)
);
create index tournament_rounds_course_idx on public.tournament_rounds(tournament_id,course_id);
create table public.scorecard_uploads (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments,
  round_id uuid not null,
  storage_path text not null unique check(split_part(storage_path,'/',1)=tournament_id::text),
  uploaded_by uuid not null default auth.uid() references auth.users,
  scan_status text not null default 'pending' check(scan_status in ('pending','approved','cancelled')),
  created_at timestamptz not null default now(),
  foreign key(tournament_id,round_id) references public.tournament_rounds(tournament_id,id)
);
create index uploads_round_idx on public.scorecard_uploads(tournament_id,round_id);
create table public.scorecard_reviews (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null unique references public.scorecard_uploads,
  extracted_data jsonb not null,
  corrected_data jsonb,
  status text not null default 'pending' check(status in ('pending','approved','cancelled')),
  reviewed_by uuid references auth.users,
  reviewed_at timestamptz
);
create table public.scorecards (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments,
  round_id uuid not null,
  player_id uuid not null,
  team_id uuid,
  status text not null default 'approved' check(status = 'approved'),
  total_strokes integer not null check(total_strokes > 0),
  relative_to_par integer,
  approved_by uuid not null references auth.users,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1 check(revision > 0),
  unique(round_id,player_id),
  unique(tournament_id,id),
  foreign key(tournament_id,round_id) references public.tournament_rounds(tournament_id,id),
  foreign key(tournament_id,player_id) references public.players(tournament_id,id),
  foreign key(tournament_id,team_id) references public.teams(tournament_id,id)
);
create index scorecards_tournament_player_idx on public.scorecards(tournament_id,player_id);
create index scorecards_tournament_team_idx on public.scorecards(tournament_id,team_id);
create table public.hole_scores (
  id uuid primary key default gen_random_uuid(),
  scorecard_id uuid not null references public.scorecards,
  hole_number integer not null check(hole_number between 1 and 18),
  strokes integer not null check(strokes between 1 and 30),
  par integer check(par between 3 and 6),
  created_at timestamptz not null default now(),
  unique(scorecard_id,hole_number)
);
create table public.score_audit_logs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments,
  scorecard_id uuid not null,
  upload_id uuid references public.scorecard_uploads,
  changed_by uuid not null references auth.users,
  previous_data jsonb,
  new_data jsonb not null,
  reason text not null,
  created_at timestamptz not null default now(),
  foreign key(tournament_id,scorecard_id) references public.scorecards(tournament_id,id)
);
create index audit_scorecard_idx on public.score_audit_logs(tournament_id,scorecard_id);

create function golf_private.owns(target uuid) returns boolean language sql stable security invoker set search_path='' as $$
  select exists(select from public.tournaments where id=target and owner_id=(select auth.uid()))
$$;
revoke execute on function golf_private.owns(uuid) from public;
grant execute on function golf_private.owns(uuid) to authenticated;

do $$
declare relation text;
begin
  foreach relation in array array['profiles','tournaments','tournament_settings','teams','players','courses','course_holes','tournament_rounds','scorecards','hole_scores','scorecard_uploads','scorecard_reviews','score_audit_logs'] loop
    execute format('alter table public.%I enable row level security',relation);
    execute format('revoke all on public.%I from anon,authenticated',relation);
    execute format('grant select on public.%I to authenticated',relation);
  end loop;
  foreach relation in array array['tournament_settings','teams','players','courses','tournament_rounds'] loop
    execute format('grant insert,update,delete on public.%I to authenticated',relation);
    execute format('create policy golf_owner on public.%I to authenticated using (golf_private.owns(tournament_id)) with check (golf_private.owns(tournament_id))',relation);
  end loop;
  foreach relation in array array['scorecards','scorecard_uploads','score_audit_logs'] loop
    execute format('create policy golf_read_owner on public.%I for select to authenticated using (golf_private.owns(tournament_id))',relation);
  end loop;
end $$;

grant update(full_name) on public.profiles to authenticated;
create policy golf_profile on public.profiles to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
grant insert(name,description,location,logo_path,start_date,end_date,timezone,scoring_format,status),
  update(name,description,location,logo_path,start_date,end_date,timezone,scoring_format,status) on public.tournaments to authenticated;
create policy golf_tournament_owner on public.tournaments to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
grant insert, update, delete on public.course_holes to authenticated;
create policy golf_course_hole_owner on public.course_holes to authenticated
  using(exists(select from public.courses c where c.id=course_id))
  with check(exists(select from public.courses c where c.id=course_id and hole_number<=c.number_of_holes));
create policy golf_hole_score_owner on public.hole_scores for select to authenticated using(exists(select from public.scorecards s where s.id=scorecard_id));
create policy golf_review_owner on public.scorecard_reviews for select to authenticated using(exists(select from public.scorecard_uploads u where u.id=upload_id));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('scorecard-images','scorecard-images',false,10485760,array['image/jpeg','image/png','image/webp']);
create policy golf_storage_upload on storage.objects for insert to authenticated with check (
  bucket_id='scorecard-images' and cardinality(storage.foldername(name))=1
  and exists(select from public.tournaments t where t.id::text=(storage.foldername(storage.objects.name))[1])
);
create policy golf_storage_read on storage.objects for select to authenticated using (
  bucket_id='scorecard-images' and exists(select from public.tournaments t where t.id::text=(storage.foldername(storage.objects.name))[1])
);
create policy golf_storage_remove_unregistered on storage.objects for delete to authenticated using (
  bucket_id='scorecard-images' and exists(select from public.tournaments t where t.id::text=(storage.foldername(storage.objects.name))[1])
  and not exists(select from public.scorecard_uploads u where u.storage_path=storage.objects.name)
);

create function golf_private.validate_tournament() returns trigger language plpgsql set search_path='' as $$
begin
  if not exists(select from pg_catalog.pg_timezone_names where name=new.timezone) then raise exception 'Invalid tournament time zone'; end if;
  new.updated_at=now();
  return new;
end $$;
create trigger golf_validate_tournament before insert or update on public.tournaments for each row execute function golf_private.validate_tournament();

create function golf_private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin
  new.updated_at=now();
  return new;
end $$;
create trigger golf_profile_updated before update on public.profiles for each row execute function golf_private.touch_updated_at();
create trigger golf_player_updated before update on public.players for each row execute function golf_private.touch_updated_at();
create trigger golf_settings_updated before update on public.tournament_settings for each row execute function golf_private.touch_updated_at();

create function public.create_golf_tournament(p_name text,p_start date,p_end date,p_timezone text,p_format text,p_holes int,p_count int,p_description text,p_location text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
  insert into public.tournaments(name,start_date,end_date,timezone,scoring_format,description,location)
  values(p_name,p_start,p_end,p_timezone,p_format,p_description,p_location) returning id into result;
  insert into public.tournament_settings(tournament_id,number_of_holes,counting_players) values(result,p_holes,p_count);
  return result;
end $$;

create function public.rotate_golf_code(p_tournament uuid) returns text language plpgsql security definer set search_path='' as $$
declare result text;
begin
  update public.tournaments set tournament_code=default where id=p_tournament and owner_id=(select auth.uid()) returning tournament_code into result;
  if not found then raise exception 'Tournament unavailable'; end if;
  return result;
end $$;

create function public.save_golf_course(p_tournament uuid,p_course uuid,p_name text,p_location text,p_rating numeric,p_slope int,p_holes jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid; hole_count int := jsonb_array_length(p_holes);
begin
  if p_course is null then
    insert into public.courses(tournament_id,name,location,number_of_holes,course_rating,slope_rating)
    values(p_tournament,p_name,p_location,hole_count,p_rating,p_slope) returning id into result;
  else
    update public.courses set name=p_name,location=p_location,number_of_holes=hole_count,course_rating=p_rating,slope_rating=p_slope
    where id=p_course and tournament_id=p_tournament and (number_of_holes=hole_count or not exists(select from public.tournament_rounds where course_id=p_course))
    returning id into result;
    if not found then raise exception 'Course unavailable or hole count is locked by a scheduled round'; end if;
    delete from public.course_holes where course_id=result;
  end if;
  insert into public.course_holes(course_id,hole_number,par,yardage)
  select result,ordinality,(value->>'par')::int,(value->>'yardage')::int from jsonb_array_elements(p_holes) with ordinality;
  return result;
end $$;

create function public.register_golf_scan(p_tournament uuid,p_round uuid,p_path text,p_extracted jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if not golf_private.owns(p_tournament) or not exists(select from storage.objects where bucket_id='scorecard-images' and name=p_path and cardinality(storage.foldername(name))=1) then
    raise exception 'Scorecard image unavailable';
  end if;
  if octet_length(p_extracted::text)>200000 then raise exception 'Scan result is too large'; end if;
  insert into public.scorecard_uploads(tournament_id,round_id,storage_path) values(p_tournament,p_round,p_path) returning id into result;
  insert into public.scorecard_reviews(upload_id,extracted_data) values(result,p_extracted);
  return result;
end $$;

create table golf_private.approvals (
  tournament_id uuid references public.tournaments,
  request_id uuid not null,
  payload jsonb not null,
  primary key(tournament_id,request_id)
);
alter table golf_private.approvals enable row level security;
create function public.approve_golf_scores(p_tournament uuid,p_round uuid,p_request uuid,p_upload uuid,p_rows jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare
  account uuid := auth.uid();
  course uuid; hole_count int; previous_payload jsonb;
  row_data record; previous_card public.scorecards; golfer public.players;
  card_id uuid; stroke_total int; par_total int; previous_data jsonb;
  payload jsonb := jsonb_build_object('round',p_round,'upload',p_upload,'rows',p_rows);
begin
  perform 1 from public.tournaments where id=p_tournament and owner_id=account for update;
  if not found then raise exception 'Tournament unavailable'; end if;
  select a.payload into previous_payload from golf_private.approvals a where tournament_id=p_tournament and request_id=p_request;
  if found then
    if previous_payload = payload then return; end if;
    raise exception 'Request already used';
  end if;
  select r.course_id,c.number_of_holes into course,hole_count from public.tournament_rounds r
  join public.courses c on c.id=r.course_id where r.id=p_round and r.tournament_id=p_tournament and r.status<>'cancelled' for share of r,c;
  if not found then raise exception 'Round unavailable'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 30 then raise exception 'Enter 1 to 30 player rows'; end if;
  if (select count(distinct value->>'player_id') from jsonb_array_elements(p_rows)) <> jsonb_array_length(p_rows) then raise exception 'Select a distinct player for each row'; end if;
  if p_upload is not null then
    perform 1 from public.scorecard_uploads where id=p_upload and tournament_id=p_tournament and round_id=p_round and scan_status='pending' for update;
    if not found then raise exception 'Scan unavailable or already approved'; end if;
  end if;
  select case when count(par)=hole_count then sum(par) end into par_total from public.course_holes where course_id=course and hole_number<=hole_count;
  for row_data in select * from jsonb_to_recordset(p_rows) as x(player_id uuid,strokes int[],expected_revision int,reason text) loop
    select * into golfer from public.players where id=row_data.player_id and tournament_id=p_tournament for share;
    if not found then raise exception 'Player unavailable'; end if;
    if cardinality(row_data.strokes) is distinct from hole_count or exists(select from unnest(row_data.strokes) as h(stroke) where stroke is null or stroke not between 1 and 30) then raise exception 'Enter valid strokes for every hole'; end if;
    select sum(stroke) into stroke_total from unnest(row_data.strokes) as h(stroke);
    select * into previous_card from public.scorecards where round_id=p_round and player_id=row_data.player_id;
    if coalesce(previous_card.revision,0) is distinct from row_data.expected_revision then raise exception 'Scores changed. Reload and confirm the revision.'; end if;
    previous_data=null;
    if previous_card.id is not null then
      if coalesce(length(btrim(row_data.reason)),0) not between 1 and 500 then raise exception 'Enter a revision reason'; end if;
      select jsonb_build_object('card',to_jsonb(previous_card),'holes',jsonb_agg(to_jsonb(h) order by h.hole_number)) into previous_data from public.hole_scores h where scorecard_id=previous_card.id;
      delete from public.hole_scores where scorecard_id=previous_card.id;
      update public.scorecards set total_strokes=stroke_total,relative_to_par=stroke_total-par_total,approved_by=account,approved_at=now(),updated_at=now(),revision=revision+1 where id=previous_card.id returning id into card_id;
    else
      if golfer.status <> 'active' then raise exception 'Player is inactive'; end if;
      insert into public.scorecards(tournament_id,round_id,player_id,team_id,total_strokes,relative_to_par,approved_by)
      values(p_tournament,p_round,golfer.id,golfer.team_id,stroke_total,stroke_total-par_total,account) returning id into card_id;
    end if;
    insert into public.hole_scores(scorecard_id,hole_number,strokes,par)
    select card_id,s.ordinality,s.stroke,h.par from unnest(row_data.strokes) with ordinality s(stroke,ordinality)
    left join public.course_holes h on h.course_id=course and h.hole_number=s.ordinality;
    insert into public.score_audit_logs(tournament_id,scorecard_id,upload_id,changed_by,previous_data,new_data,reason)
    values(p_tournament,card_id,p_upload,account,previous_data,to_jsonb(row_data),coalesce(nullif(row_data.reason,''),'Initial approval'));
  end loop;
  if p_upload is not null then
    update public.scorecard_uploads set scan_status='approved' where id=p_upload;
    update public.scorecard_reviews set corrected_data=p_rows,status='approved',reviewed_by=account,reviewed_at=now() where upload_id=p_upload;
  end if;
  insert into golf_private.approvals values(p_tournament,p_request,payload);
end $$;

revoke execute on function public.create_golf_tournament(text,date,date,text,text,int,int,text,text),public.rotate_golf_code(uuid),public.save_golf_course(uuid,uuid,text,text,numeric,int,jsonb),public.register_golf_scan(uuid,uuid,text,jsonb),public.approve_golf_scores(uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_golf_tournament(text,date,date,text,text,int,int,text,text),public.rotate_golf_code(uuid),public.save_golf_course(uuid,uuid,text,text,numeric,int,jsonb),public.register_golf_scan(uuid,uuid,text,jsonb),public.approve_golf_scores(uuid,uuid,uuid,uuid,jsonb) to authenticated;
create function public.update_golf_settings(p_tournament uuid,p_name text,p_start date,p_end date,p_timezone text,p_format text,p_holes int,p_count int,p_policy text,p_status text,p_description text,p_location text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  update public.tournaments set name=p_name,start_date=p_start,end_date=p_end,timezone=p_timezone,scoring_format=p_format,status=p_status,description=p_description,location=p_location where id=p_tournament;
  if not found then raise exception 'Tournament unavailable'; end if;
  insert into public.tournament_settings(tournament_id,number_of_holes,counting_players,team_scoring_policy)
  values(p_tournament,p_holes,p_count,p_policy)
  on conflict(tournament_id) do update set number_of_holes=excluded.number_of_holes,counting_players=excluded.counting_players,team_scoring_policy=excluded.team_scoring_policy,updated_at=now();
end $$;
create function public.cancel_golf_scan(p_tournament uuid,p_upload uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not golf_private.owns(p_tournament) then raise exception 'Tournament unavailable'; end if;
  update public.scorecard_uploads set scan_status='cancelled' where id=p_upload and tournament_id=p_tournament and scan_status='pending';
  if not found then raise exception 'Review is no longer pending'; end if;
  update public.scorecard_reviews set status='cancelled',reviewed_by=auth.uid(),reviewed_at=now() where upload_id=p_upload;
end $$;
create function golf_private.guard_scoring_context() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_table_name='courses' then
    if old.number_of_holes<>new.number_of_holes and exists(select from public.tournament_rounds where course_id=old.id) then raise exception 'Scheduled course hole count is fixed'; end if;
  elsif old.course_id<>new.course_id and exists(select from public.scorecards where round_id=old.id) then
    raise exception 'The course is fixed after scores are approved';
  end if;
  return new;
end $$;
create trigger golf_lock_course before update on public.courses for each row execute function golf_private.guard_scoring_context();
create trigger golf_lock_round before update on public.tournament_rounds for each row execute function golf_private.guard_scoring_context();

create function golf_private.score_update() returns trigger language plpgsql security definer set search_path='' as $$
declare code text;
begin
  select tournament_code into code from public.tournaments where id=new.tournament_id;
  perform realtime.send('{}'::jsonb,'scores_changed','golf:'||code,false);
  return new;
exception when others then
  return new;
end $$;
create trigger golf_score_update after insert on golf_private.approvals for each row execute function golf_private.score_update();

create function golf_private.golf_report(target uuid) returns jsonb language sql stable security invoker set search_path='' as $$
with planned as (
  select count(*) as round_count from public.tournament_rounds where tournament_id=target and status<>'cancelled'
), official as (
  select s.*,r.round_number,r.start_time
  from public.scorecards s join public.tournament_rounds r on r.id=s.round_id
  where s.tournament_id=target and r.status<>'cancelled'
), individual as (
  select p.id,p.full_name,t.name as team,p.status,count(s.id) as rounds,count(s.id)=(select round_count from planned) and count(s.id)>0 as complete,
    sum(s.total_strokes) as strokes,case when count(s.id)=count(s.relative_to_par) then sum(s.relative_to_par) end as relative,
    round(avg(s.total_strokes),2) as average,min(s.total_strokes) as best,max(s.total_strokes) as worst
  from public.players p left join public.teams t on t.id=p.team_id left join official s on s.player_id=p.id
  where p.tournament_id=target group by p.id,t.name
), individual_rank as (
  select *,case when rounds>0 then rank() over(order by rounds desc,strokes asc nulls last) end as position from individual
), roster_sizes as (
  select t.id,greatest(1,count(p.id)) as active_count from public.teams t left join public.players p on p.team_id=t.id and p.status='active'
  where t.tournament_id=target group by t.id
), team_candidates as (
  select s.*,row_number() over(partition by s.team_id,s.round_id order by s.total_strokes,s.player_id) as selected,
  case when cfg.team_scoring_policy='all' then greatest(roster.active_count,count(*) over(partition by s.team_id,s.round_id))
       else coalesce(cfg.counting_players,4) end as required
  from official s join roster_sizes roster on roster.id=s.team_id left join public.tournament_settings cfg on cfg.tournament_id=target
), team_rounds as (
  select team_id,round_id,min(round_number) as round_number,count(*) as counting_players,sum(total_strokes) as strokes,
    case when count(*)=count(relative_to_par) then sum(relative_to_par) end as relative
  from team_candidates where selected<=required group by team_id,round_id having count(*)=max(required)
), team_totals as (
  select t.id,t.name,count(tr.round_id) as rounds,sum(tr.counting_players) as counting_players,sum(tr.strokes) as strokes,
    case when count(tr.round_id)=count(tr.relative) then sum(tr.relative) end as relative,
    (select round(avg(s.total_strokes),2) from official s where s.team_id=t.id) as average,
    (select p.full_name from official s join public.players p on p.id=s.player_id where s.team_id=t.id
      group by p.id order by avg(s.total_strokes),p.full_name,p.id limit 1) as best_player
  from public.teams t left join team_rounds tr on tr.team_id=t.id where t.tournament_id=target group by t.id
), team_rank as (
  select *,case when rounds>0 then rank() over(order by rounds desc,strokes asc nulls last) end as position from team_totals
), player_holes as (
  select s.player_id,h.hole_number,h.strokes,h.par from official s join public.hole_scores h on h.scorecard_id=s.id
), player_events as (
  select player_id,count(*) filter(where strokes-par<=-2) as eagles,count(*) filter(where strokes-par=-1) as birdies,
    count(*) filter(where strokes=par) as pars,count(*) filter(where strokes-par=1) as bogeys,
    count(*) filter(where strokes-par=2) as double_bogeys,count(par) as known_pars
  from player_holes group by player_id
), hole_trends as (
  select player_id,hole_number,round(avg(strokes),2) as average from player_holes group by player_id,hole_number
), distribution as (
  select total_strokes as strokes,count(*) as scorecards from official group by total_strokes
), checkpoints as (
  select r.round_number,r.start_time,s.player_id,count(*) as rounds,sum(s.total_strokes) as strokes
  from public.tournament_rounds r join official s on (s.start_time,s.round_number)<=(r.start_time,r.round_number)
  where r.tournament_id=target and r.status<>'cancelled'
    and exists(select from official card where card.round_id=r.id)
  group by r.id,s.player_id
), progression as (
  select *,rank() over(partition by round_number order by rounds desc,strokes asc) as position
  from checkpoints
)
select jsonb_build_object(
  'individual',coalesce((select jsonb_agg(to_jsonb(i) order by i.position nulls last,i.full_name) from individual_rank i),'[]'::jsonb),
  'teams',coalesce((select jsonb_agg(to_jsonb(t) order by t.position nulls last,t.name) from team_rank t),'[]'::jsonb),
  'team_rounds',coalesce((select jsonb_agg(to_jsonb(t) order by t.round_number) from team_rounds t),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(to_jsonb(e)) from player_events e),'[]'::jsonb),
  'holes',coalesce((select jsonb_agg(to_jsonb(h) order by h.hole_number) from hole_trends h),'[]'::jsonb),
  'distribution',coalesce((select jsonb_agg(to_jsonb(d) order by d.strokes) from distribution d),'[]'::jsonb),
  'progression',coalesce((select jsonb_agg(to_jsonb(p) order by p.start_time,p.round_number) from progression p),'[]'::jsonb),
  'summary',jsonb_build_object(
    'players',(select count(*) from individual),'teams',(select count(*) from team_rank),
    'scheduled_rounds',(select round_count from planned),
    'completed_rounds',(select count(*) from public.tournament_rounds where tournament_id=target and status='completed'),
    'best',(select min(total_strokes) from official),'worst',(select max(total_strokes) from official),'average',(select round(avg(total_strokes),2) from official)
  )
);
$$;

create function public.owner_golf_report(p_tournament uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
  if not golf_private.owns(p_tournament) then raise exception 'Tournament unavailable'; end if;
  return golf_private.golf_report(p_tournament);
end $$;

create function public.public_golf_tournament(p_code text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t public.tournaments;
begin
  if p_code is null or p_code !~ '^GOLF-[0-9A-F]{16}$' then return null; end if;
  select * into t from public.tournaments where tournament_code=p_code;
  if not found then return null; end if;
  return jsonb_build_object(
    'tournament',jsonb_build_object('name',t.name,'description',t.description,'location',t.location,'start_date',t.start_date,'end_date',t.end_date,'timezone',t.timezone,'scoring_format',t.scoring_format,'status',t.status),
    'teams',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'description',description) order by name) from public.teams where tournament_id=t.id),'[]'::jsonb),
    'players',coalesce((select jsonb_agg(jsonb_build_object('id',id,'full_name',full_name,'team_id',team_id,'status',status) order by full_name) from public.players where tournament_id=t.id),'[]'::jsonb),
    'rounds',coalesce((select jsonb_agg(jsonb_build_object('id',id,'course_id',course_id,'name',name,'round_number',round_number,'status',status,'start_time',start_time) order by start_time) from public.tournament_rounds where tournament_id=t.id),'[]'::jsonb),
    'courses',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'number_of_holes',number_of_holes) order by name) from public.courses where tournament_id=t.id),'[]'::jsonb),
    'cards',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'player_id',s.player_id,'round_id',s.round_id,'total_strokes',s.total_strokes,'relative_to_par',s.relative_to_par,
      'hole_scores',(select jsonb_agg(jsonb_build_object('hole_number',h.hole_number,'strokes',h.strokes,'par',h.par) order by h.hole_number) from public.hole_scores h where h.scorecard_id=s.id)) order by r.round_number,s.total_strokes)
      from public.scorecards s join public.tournament_rounds r on r.id=s.round_id where s.tournament_id=t.id and r.status<>'cancelled'),'[]'::jsonb),
    'report',golf_private.golf_report(t.id)
  );
end $$;
revoke execute on function public.update_golf_settings(uuid,text,date,date,text,text,int,int,text,text,text,text),public.cancel_golf_scan(uuid,uuid),public.owner_golf_report(uuid),public.public_golf_tournament(text),golf_private.golf_report(uuid),golf_private.score_update() from public,anon,authenticated;
grant execute on function public.update_golf_settings(uuid,text,date,date,text,text,int,int,text,text,text,text),public.cancel_golf_scan(uuid,uuid),public.owner_golf_report(uuid),golf_private.golf_report(uuid) to authenticated;
grant execute on function public.public_golf_tournament(text) to anon,authenticated;


insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('golf-logos','golf-logos',false,2097152,array['image/jpeg','image/png','image/webp']);
create policy golf_logo_upload on storage.objects for insert to authenticated with check (
  bucket_id='golf-logos' and cardinality(storage.foldername(name))=1
  and exists(select from public.tournaments t where t.id::text=(storage.foldername(storage.objects.name))[1])
);
create policy golf_logo_read on storage.objects for select to authenticated using (
  bucket_id='golf-logos' and exists(select from public.tournaments t where t.id::text=(storage.foldername(storage.objects.name))[1])
);
create policy golf_logo_delete on storage.objects for delete to authenticated using (
  bucket_id='golf-logos' and exists(select from public.tournaments t where t.id::text=(storage.foldername(storage.objects.name))[1])
);
commit;

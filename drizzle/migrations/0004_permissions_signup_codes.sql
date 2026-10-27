alter table public.volunteer_codes add column role text not null default 'volunteer';

alter table public.profiles add column deactivated boolean not null default false;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _req text := coalesce(new.raw_user_meta_data->>'requested_role', 'volunteer');
  _code text := upper(trim(coalesce(new.raw_user_meta_data->>'volunteer_code', '')));
begin
  if _req not in ('volunteer','staff','viewer') then _req := 'volunteer'; end if;
  if _req = 'volunteer' then
    if not exists (select 1 from public.volunteer_codes where code = _code and role = 'volunteer' and used_by is null) then
      raise exception 'Invalid or already used volunteer code';
    end if;
  elsif _req = 'staff' then
    if not exists (select 1 from public.volunteer_codes where code = _code and role = 'admin' and used_by is null) then
      raise exception 'Invalid or already used staff code';
    end if;
  end if;
  insert into public.profiles (id, full_name, requested_role, volunteer_code)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), _req, nullif(_code, ''));
  if _code <> '' then
    update public.volunteer_codes set used_by = new.id, used_at = now() where code = _code;
  end if;
  if _req = 'volunteer' then
    insert into public.user_roles (user_id, role) values (new.id, 'volunteer');
  elsif _req = 'viewer' then
    insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  elsif _req = 'staff' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;

create or replace function public.can_access_child(_child_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce((select deactivated from public.profiles where id = auth.uid()), false) then
    return false;
  end if;
  return public.has_role(auth.uid(), 'admin')
    or (public.is_qualified(auth.uid()) and exists (
      select 1 from public.child_assignments
      where child_id = _child_id and volunteer_id = auth.uid()));
end; $$;

create or replace function public.can_read_content()
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce((select deactivated from public.profiles where id = auth.uid()), false) then
    return false;
  end if;
  return public.has_role(auth.uid(), 'admin') or public.is_qualified(auth.uid())
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role::text = 'viewer');
end; $$;

drop policy if exists "Sessions for accessible children" on public.sessions;
create policy "Read sessions for accessible children" on public.sessions for select to authenticated
  using (public.can_access_child(child_id));
create policy "Create own sessions" on public.sessions for insert to authenticated
  with check (public.can_access_child(child_id) and (volunteer_id = auth.uid() or public.has_role(auth.uid(), 'admin')));
create policy "Update own sessions" on public.sessions for update to authenticated
  using (public.can_access_child(child_id) and (volunteer_id = auth.uid() or public.has_role(auth.uid(), 'admin')))
  with check (public.can_access_child(child_id) and (volunteer_id = auth.uid() or public.has_role(auth.uid(), 'admin')));
create policy "Admin delete sessions" on public.sessions for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Handover for accessible sessions" on public.handover_feedback;
create policy "Read handover for accessible sessions" on public.handover_feedback for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = handover_feedback.session_id and public.can_access_child(s.child_id)));
create policy "Write own handover" on public.handover_feedback for insert to authenticated
  with check (exists (select 1 from public.sessions s where s.id = handover_feedback.session_id and public.can_access_child(s.child_id) and (s.volunteer_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));
create policy "Update own handover" on public.handover_feedback for update to authenticated
  using (exists (select 1 from public.sessions s where s.id = handover_feedback.session_id and (s.volunteer_id = auth.uid() or public.has_role(auth.uid(), 'admin'))))
  with check (exists (select 1 from public.sessions s where s.id = handover_feedback.session_id and (s.volunteer_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));
create policy "Delete own handover" on public.handover_feedback for delete to authenticated
  using (exists (select 1 from public.sessions s where s.id = handover_feedback.session_id and (s.volunteer_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));

create or replace function public.guard_child_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.has_role(auth.uid(), 'admin') then return new; end if;
  if new.nickname is distinct from old.nickname
     or new.age_band is distinct from old.age_band
     or new.communication_notes is distinct from old.communication_notes
     or new.archived is distinct from old.archived then
    raise exception 'Only programme staff can change these details';
  end if;
  return new;
end; $$;
create trigger children_guard before update on public.children
  for each row execute function public.guard_child_update();

create table public.child_level_changes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  volunteer_id uuid not null references public.profiles(id),
  old_level integer not null,
  new_level integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.child_level_changes to authenticated;
grant all on public.child_level_changes to service_role;
alter table public.child_level_changes enable row level security;
create policy "Read level changes for accessible children" on public.child_level_changes for select to authenticated
  using (public.can_access_child(child_id));
create policy "Insert own level changes" on public.child_level_changes for insert to authenticated
  with check (volunteer_id = auth.uid() and public.can_access_child(child_id));

create or replace function public.change_child_level(_child_id uuid, _new_level integer, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare _old integer;
begin
  if not public.can_access_child(_child_id) then raise exception 'Forbidden'; end if;
  if _new_level not between 1 and 3 then raise exception 'Level must be 1 to 3'; end if;
  if length(trim(coalesce(_reason, ''))) < 3 then raise exception 'Please give a short reason'; end if;
  select current_level into _old from public.children where id = _child_id;
  if _old is null or _old = _new_level then return; end if;
  update public.children set current_level = _new_level where id = _child_id;
  insert into public.child_level_changes (child_id, volunteer_id, old_level, new_level, reason)
    values (_child_id, auth.uid(), _old, _new_level, trim(_reason));
end; $$;

create or replace function public.set_volunteer_active(_user_id uuid, _active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.profiles set deactivated = not _active where id = _user_id;
end; $$;
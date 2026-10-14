alter type public.app_role add value if not exists 'viewer';

alter table public.profiles add column if not exists requested_role text not null default 'volunteer';
alter table public.profiles add column if not exists volunteer_code text;

create table public.volunteer_codes (
  code text primary key,
  label text not null default '',
  created_at timestamptz not null default now(),
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz
);
grant select, insert, update, delete on public.volunteer_codes to authenticated;
grant all on public.volunteer_codes to service_role;
alter table public.volunteer_codes enable row level security;
create policy "Admin manage codes" on public.volunteer_codes for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.can_read_content()
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return public.has_role(auth.uid(), 'admin') or public.is_qualified(auth.uid())
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role::text = 'viewer');
end; $$;

drop policy if exists "Qualified read approved books" on public.books;
create policy "Read approved books" on public.books for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or (status = 'approved' and public.can_read_content()));
drop policy if exists "Qualified read approved words" on public.word_cards;
create policy "Read approved words" on public.word_cards for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or (status = 'approved' and public.can_read_content()));
drop policy if exists "Qualified read approved prompts" on public.discussion_prompts;
create policy "Read approved prompts" on public.discussion_prompts for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or (status = 'approved' and public.can_read_content()));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _req text := coalesce(new.raw_user_meta_data->>'requested_role', 'volunteer');
  _code text := upper(trim(coalesce(new.raw_user_meta_data->>'volunteer_code', '')));
  _first boolean := not exists (select 1 from public.user_roles where role = 'admin');
begin
  if _req not in ('volunteer','staff','viewer') then _req := 'volunteer'; end if;
  if _req = 'volunteer' and not _first then
    if not exists (select 1 from public.volunteer_codes where code = _code and used_by is null) then
      raise exception 'Invalid or already used volunteer code';
    end if;
  end if;
  insert into public.profiles (id, full_name, requested_role, volunteer_code)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), _req, nullif(_code, ''));
  if _req = 'volunteer' and _code <> '' then
    update public.volunteer_codes set used_by = new.id, used_at = now() where code = _code;
  end if;
  if _first then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  elsif _req = 'volunteer' then
    insert into public.user_roles (user_id, role) values (new.id, 'volunteer');
  elsif _req = 'viewer' then
    insert into public.user_roles (user_id, role) values (new.id, 'viewer'::text::public.app_role);
  end if;
  return new;
end; $$;

create or replace function public.submit_guide_quiz(_answers int[])
returns boolean language plpgsql security definer set search_path = public as $$
declare _total int; _right int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select count(*), count(*) filter (where correct_index = _answers[rn])
    into _total, _right
    from (select correct_index, row_number() over (order by sort_order, id) rn from public.guide_quiz_questions) q;
  if _total > 0 and _right = _total then
    update public.profiles set qualified = true, quiz_passed_at = now(), guide_progress = 100 where id = auth.uid();
    return true;
  end if;
  return false;
end; $$;

create or replace function public.approve_staff(_user_id uuid, _approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  if _approve then
    insert into public.user_roles (user_id, role) values (_user_id, 'admin') on conflict do nothing;
  end if;
  update public.profiles set requested_role = case when _approve then 'staff' else 'volunteer' end where id = _user_id;
  if not _approve then
    insert into public.user_roles (user_id, role) values (_user_id, 'volunteer') on conflict do nothing;
  end if;
end; $$;
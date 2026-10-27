ALTER TABLE public.volunteer_codes ADD COLUMN IF NOT EXISTS reusable boolean NOT NULL DEFAULT false;

UPDATE public.volunteer_codes SET reusable = true WHERE code IN ('ADMIN', 'VOLUNTEER');

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _req text := coalesce(new.raw_user_meta_data->>'requested_role', 'volunteer');
  _code text := upper(trim(coalesce(new.raw_user_meta_data->>'volunteer_code', '')));
begin
  if _req not in ('volunteer','staff','viewer') then _req := 'volunteer'; end if;
  if _req = 'volunteer' then
    if not exists (select 1 from public.volunteer_codes where code = _code and role = 'volunteer' and (used_by is null or reusable)) then
      raise exception 'Invalid or already used volunteer code';
    end if;
  elsif _req = 'staff' then
    if not exists (select 1 from public.volunteer_codes where code = _code and role = 'admin' and (used_by is null or reusable)) then
      raise exception 'Invalid or already used staff code';
    end if;
  end if;
  insert into public.profiles (id, full_name, requested_role, volunteer_code)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), _req, nullif(_code, ''));
  if _code <> '' then
    update public.volunteer_codes set used_by = new.id, used_at = now() where code = _code and not reusable;
  end if;
  if _req = 'volunteer' then
    insert into public.user_roles (user_id, role) values (new.id, 'volunteer');
  elsif _req = 'viewer' then
    insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  elsif _req = 'staff' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $function$;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guide_cards_read uuid[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.mark_guide_card_read(_card_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  update public.profiles
     set guide_cards_read = array_append(guide_cards_read, _card_id)
   where id = auth.uid()
     and not (_card_id = any(guide_cards_read))
     and exists (select 1 from public.guide_cards where id = _card_id);
$$;
GRANT EXECUTE ON FUNCTION public.mark_guide_card_read(uuid) TO authenticated;

-- Qualification lasts one year from passing, and lapses after 6 months without signing in.
CREATE OR REPLACE FUNCTION public.is_qualified(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select coalesce((select qualified
      and quiz_passed_at is not null and quiz_passed_at > now() - interval '1 year'
      and (last_login_at is null or last_login_at > now() - interval '6 months')
    from public.profiles where id = _user_id), false)
$$;

CREATE OR REPLACE FUNCTION public.touch_last_login()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  update public.profiles set
    qualified = qualified
      and quiz_passed_at is not null and quiz_passed_at > now() - interval '1 year'
      and (last_login_at is null or last_login_at > now() - interval '6 months'),
    last_login_at = now()
  where id = auth.uid();
$$;

-- Approving a story also approves a draft book and its word cards and prompts.
CREATE OR REPLACE FUNCTION public.approve_book_story(_book_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.book_stories set status = 'approved', updated_at = now() where book_id = _book_id;
  update public.books set status = 'approved' where id = _book_id;
  update public.word_cards set status = 'approved' where book_id = _book_id;
  update public.discussion_prompts set status = 'approved' where book_id = _book_id;
end; $$;
GRANT EXECUTE ON FUNCTION public.approve_book_story(uuid) TO authenticated;
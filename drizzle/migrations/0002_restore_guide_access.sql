GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_cards TO authenticated;
GRANT ALL ON public.guide_cards TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.guide_quiz_questions TO authenticated;
GRANT ALL ON public.guide_quiz_questions TO service_role;
REVOKE SELECT ON public.guide_quiz_questions FROM authenticated;
GRANT SELECT (id, question, options, guide_card_id, sort_order) ON public.guide_quiz_questions TO authenticated;
REVOKE ALL ON FUNCTION public.submit_guide_quiz(integer[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_guide_quiz(integer[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.submit_guide_quiz(_answers int[])
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _total int; _right int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT (public.has_role(auth.uid(), 'volunteer') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Volunteer access is required';
  END IF;
  SELECT count(*), count(*) FILTER (WHERE correct_index = _answers[rn]) INTO _total, _right
  FROM (SELECT correct_index, row_number() OVER (ORDER BY sort_order, id) rn FROM public.guide_quiz_questions) q;
  IF _total > 0 AND cardinality(_answers) = _total AND _right = _total THEN
    UPDATE public.profiles SET qualified = true, quiz_passed_at = now(), guide_progress = 100 WHERE id = auth.uid();
    RETURN true;
  END IF;
  RETURN false;
END; $$;
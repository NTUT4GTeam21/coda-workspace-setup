CREATE TABLE public.book_stories (
 book_id uuid PRIMARY KEY REFERENCES public.books(id) ON DELETE CASCADE,
 pages text[] NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
 source text NOT NULL DEFAULT 'AI-written original',
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (cardinality(pages) >= 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_stories TO authenticated;
GRANT ALL ON public.book_stories TO service_role;
ALTER TABLE public.book_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage story drafts" ON public.book_stories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Readers see reviewed stories" ON public.book_stories FOR SELECT TO authenticated USING (status = 'approved' AND public.can_read_content() AND EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_id AND b.status = 'approved'));
CREATE FUNCTION public.submit_guide_quiz_feedback(_answers integer[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _total integer; _incorrect jsonb; _passed boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 IF NOT (public.has_role(auth.uid(), 'volunteer') OR public.has_role(auth.uid(), 'admin')) THEN RAISE EXCEPTION 'Volunteer access is required'; END IF;
 SELECT count(*) INTO _total FROM public.guide_quiz_questions;
 IF _total = 0 OR cardinality(_answers) IS DISTINCT FROM _total OR array_lower(_answers,1) IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Answer every question'; END IF;
 SELECT coalesce(jsonb_agg(id ORDER BY rn), '[]'::jsonb) INTO _incorrect FROM (SELECT id,correct_index,row_number() OVER (ORDER BY sort_order,id) rn FROM public.guide_quiz_questions) q WHERE correct_index IS DISTINCT FROM _answers[rn];
 _passed := jsonb_array_length(_incorrect) = 0;
 IF _passed THEN UPDATE public.profiles SET qualified = true, quiz_passed_at = now(), guide_progress = 100 WHERE id = auth.uid(); END IF;
 RETURN jsonb_build_object('passed',_passed,'total',_total,'incorrect_question_ids',_incorrect);
END; $$;
REVOKE ALL ON FUNCTION public.submit_guide_quiz_feedback(integer[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_guide_quiz_feedback(integer[]) TO authenticated;
COMMENT ON FUNCTION public.submit_guide_quiz_feedback(integer[]) IS 'Scores in database; returns incorrect question IDs, never correct option indexes.';
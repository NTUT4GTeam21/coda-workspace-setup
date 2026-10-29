CREATE OR REPLACE FUNCTION public.can_manage_session(_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = _session_id AND public.can_access_child(s.child_id) AND (s.volunteer_id = auth.uid() OR public.has_role(auth.uid(), 'admin')));
$$;
REVOKE ALL ON FUNCTION public.can_manage_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.transfer_ongoing_session(_session_id uuid, _volunteer_id uuid, _expected_volunteer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.sessions%ROWTYPE;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') OR coalesce((SELECT deactivated FROM public.profiles WHERE id = auth.uid()), true) THEN
  RAISE EXCEPTION 'Only active programme staff can transfer sessions.';
 END IF;
 SELECT * INTO s FROM public.sessions WHERE id = _session_id FOR UPDATE;
 IF NOT FOUND OR s.status <> 'in_progress' THEN RAISE EXCEPTION 'This session is no longer in progress. Refresh and try again.'; END IF;
 IF s.volunteer_id IS DISTINCT FROM _expected_volunteer_id THEN RAISE EXCEPTION 'This session has already been transferred. Refresh and try again.'; END IF;
 IF s.volunteer_id = _volunteer_id THEN RAISE EXCEPTION 'Choose a different volunteer.'; END IF;
 IF EXISTS (SELECT 1 FROM public.handover_feedback WHERE session_id = s.id) THEN RAISE EXCEPTION 'A session with saved handover notes cannot be transferred.'; END IF;
 IF NOT public.has_role(_volunteer_id, 'volunteer') OR NOT public.is_qualified(_volunteer_id)
 OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _volunteer_id AND NOT deactivated)
 OR NOT EXISTS (SELECT 1 FROM public.child_assignments WHERE child_id = s.child_id AND volunteer_id = _volunteer_id) THEN
  RAISE EXCEPTION 'Choose an active, qualified volunteer assigned to this child.';
 END IF;
 UPDATE public.sessions SET volunteer_id = _volunteer_id WHERE id = s.id;
END;
$$;
REVOKE ALL ON FUNCTION public.transfer_ongoing_session(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_ongoing_session(uuid, uuid, uuid) TO authenticated;

DROP POLICY "Quiz results for accessible sessions" ON public.quiz_results;
CREATE POLICY "Read quiz for accessible sessions" ON public.quiz_results FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND public.can_access_child(s.child_id)));
CREATE POLICY "Write quiz for own sessions" ON public.quiz_results FOR INSERT TO authenticated WITH CHECK (public.can_manage_session(session_id));
CREATE POLICY "Update quiz for own sessions" ON public.quiz_results FOR UPDATE TO authenticated USING (public.can_manage_session(session_id)) WITH CHECK (public.can_manage_session(session_id));
CREATE POLICY "Delete quiz for own sessions" ON public.quiz_results FOR DELETE TO authenticated USING (public.can_manage_session(session_id));
ALTER POLICY "Update own handover" ON public.handover_feedback USING (public.can_manage_session(session_id)) WITH CHECK (public.can_manage_session(session_id));
ALTER POLICY "Delete own handover" ON public.handover_feedback USING (public.can_manage_session(session_id));

DROP POLICY "Tricky words for accessible children" ON public.tricky_words;
CREATE POLICY "Read tricky words for accessible children" ON public.tricky_words FOR SELECT TO authenticated USING (public.can_access_child(child_id));
CREATE POLICY "Write tricky words for own sessions" ON public.tricky_words FOR INSERT TO authenticated WITH CHECK (public.can_access_child(child_id) AND (session_id IS NULL OR (public.can_manage_session(session_id) AND EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.child_id = tricky_words.child_id))));
CREATE POLICY "Update tricky words for own sessions" ON public.tricky_words FOR UPDATE TO authenticated USING (public.can_access_child(child_id) AND (session_id IS NULL OR public.can_manage_session(session_id) OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.status = 'completed'))) WITH CHECK (public.can_access_child(child_id) AND (session_id IS NULL OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.child_id = tricky_words.child_id AND (public.can_manage_session(s.id) OR s.status = 'completed'))));
CREATE POLICY "Delete tricky words for own sessions" ON public.tricky_words FOR DELETE TO authenticated USING (public.can_access_child(child_id) AND (session_id IS NULL OR public.can_manage_session(session_id)));
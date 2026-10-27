import { createFileRoute, Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SessionStory } from "@/components/SessionStory";
import { QuickRecap } from "@/components/QuickRecap";
import { COMPLETED_SESSION_STATUS, sessionStatusLabel } from "@/lib/session-status";
import { finishedBookLabel, friendlySaveError, levelFitLabel } from "@/lib/labels";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
  head: () => ({ meta: [{ title: "Session · Read between the Signs" }, { name: "description", content: "Run a reading session and save notes." }, { property: "og:title", content: "Session · Read between the Signs" }, { property: "og:description", content: "Run a reading session and save notes." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SessionPage,
});

const BLOCK_LABELS: Record<string, string> = {
  recap: "Recap",
  key_words: "Key words",
  read: "Read",
  quiz: "Quiz",
  handover: "Handover",
};

type Feedback = { engagement: number; confidence: number; level_fit: string; finished_book: string; worked_well: string; try_next: string; notes: string };
const EMPTY_FB: Feedback = { engagement: 3, confidence: 3, level_fit: "about_right", finished_book: "yes", worked_well: "", try_next: "", notes: "" };

function SessionPage() {
  const { sessionId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [word, setWord] = useState("");
  const [fb, setFb] = useState<Feedback>(EMPTY_FB);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editWordId, setEditWordId] = useState<string | null>(null);
  const [editWordText, setEditWordText] = useState("");
  const { data: me } = useMe();
  const draftKey = `handover-draft-${sessionId}`;
  const restored = useRef(false);

  const key = ["session", sessionId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: s } = await supabase
        .from("sessions")
        .select("*, children(id, nickname), books(id, title, link_url), session_templates(name, total_minutes, blocks)")
        .eq("id", sessionId)
        .maybeSingle();
      const [{ data: words }, { data: hf }, { data: books }] = await Promise.all([
        supabase.from("tricky_words").select("id, word, mastered").eq("session_id", sessionId),
        supabase.from("handover_feedback").select("*").eq("session_id", sessionId).maybeSingle(),
        supabase.from("books").select("id, title, level").eq("status", "approved").order("level").order("title"),
      ]);
      return { s, words: words ?? [], hf, books: books ?? [] };
    },
  });

  // Restore an auto-saved handover draft once the session has loaded.
  useEffect(() => {
    if (restored.current || !data) return;
    restored.current = true;
    if (data.hf) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        setFb({ ...EMPTY_FB, ...JSON.parse(raw) });
        setDirty(true);
        toast.info("Restored your unsaved notes from last time.");
      }
    } catch {
      // Ignore a broken draft.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Auto-save handover progress locally as the volunteer types.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => localStorage.setItem(draftKey, JSON.stringify(fb)), 500);
    return () => clearTimeout(t);
  }, [fb, dirty, draftKey]);

  // Remind the volunteer before leaving with unsaved notes.
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    withResolver: true,
    enableBeforeUnload: dirty,
    disabled: !dirty,
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data?.s) return <p>Session not found.</p>;
  const { s, words, hf, books } = data;
  const template = s.session_templates as { name: string; total_minutes: number; blocks: { type: string; minutes: number }[] } | null;
  const isOwner = s.volunteer_id === me?.id;
  const canWrite = isOwner || me?.isAdmin;

  const updateFb = (next: Feedback) => {
    setFb(next);
    setDirty(true);
  };

  async function addWord(e: FormEvent) {
    e.preventDefault();
    if (!word.trim() || !s) return;
    const { error } = await supabase.from("tricky_words").insert({ child_id: s.child_id, session_id: sessionId, word: word.trim() });
    if (error) { toast.error(friendlySaveError(error.message)); return; }
    setWord("");
    qc.invalidateQueries({ queryKey: key });
  }

  async function toggleMastered(id: string, mastered: boolean) {
    const { error } = await supabase.from("tricky_words").update({ mastered }).eq("id", id);
    if (error) { toast.error(friendlySaveError(error.message)); return; }
    qc.invalidateQueries({ queryKey: key });
  }

  async function saveWordEdit(id: string) {
    const text = editWordText.trim();
    if (!text) return;
    const { error } = await supabase.from("tricky_words").update({ word: text }).eq("id", id);
    if (error) { toast.error(friendlySaveError(error.message)); return; }
    setEditWordId(null);
    qc.invalidateQueries({ queryKey: key });
  }

  async function pickBook(bookId: string) {
    const { error } = await supabase.from("sessions").update({ book_id: bookId }).eq("id", sessionId);
    if (error) { toast.error(friendlySaveError(error.message)); return; }
    toast.success("Book chosen for this session.");
    qc.invalidateQueries({ queryKey: key });
  }

  async function deleteSession() {
    const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
    if (error) { toast.error(friendlySaveError(error.message)); return; }
    toast.success("Session deleted.");
    navigate({ to: "/children/$childId", params: { childId: s!.child_id } });
  }

  async function finish(e: FormEvent) {
    e.preventDefault();
    if (!fb.worked_well.trim() || !fb.try_next.trim()) {
      toast.error("Please fill in “What worked well” and “Note for the next volunteer” before saving.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("handover_feedback").upsert({ session_id: sessionId, ...fb }, { onConflict: "session_id" });
    if (error) { setBusy(false); toast.error(friendlySaveError(error.message)); return; }
    const { error: statusError } = await supabase.from("sessions").update({ status: COMPLETED_SESSION_STATUS }).eq("id", sessionId);
    setBusy(false);
    if (statusError) { toast.error("Notes saved, but the session could not finish. Please try again."); return; }
    localStorage.removeItem(draftKey);
    setDirty(false);
    toast.success("Session saved for the next volunteer.");
    setEditing(false);
    qc.invalidateQueries();
  }

  const scale = (k: "engagement" | "confidence", label: string) => (
    <fieldset>
      <legend className="text-sm font-semibold">{label} (1–5)</legend>
      <div className="mt-1 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <Button variant={fb[k] === n ? "default" : "outline"} type="button" key={n} aria-pressed={fb[k] === n} onClick={() => updateFb({ ...fb, [k]: n })}
            className="h-11 w-11 rounded-lg border font-semibold">{n}</Button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link to="/children/$childId" params={{ childId: s.child_id }} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to {s.children?.nickname}
      </Link>
      <header>
        <h1 className="text-3xl font-bold">Session with {s.children?.nickname}</h1>
        <p className="mt-1 text-muted-foreground">{new Date(s.scheduled_at).toLocaleString()} · {sessionStatusLabel(s.status)}</p>
        {s.books && (
          <p className="mt-2">Book: <Link to="/library/$bookId" params={{ bookId: s.books.id }} className="font-semibold text-primary underline">{s.books.title}</Link></p>
        )}
      </header>

      {me?.isAdmin && !hf && (
        <div className="rounded-2xl border border-destructive/40 bg-card p-4">
          <p className="text-sm text-muted-foreground">This session has no handover note yet. Staff can delete abandoned sessions.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="mt-2 min-h-11 text-destructive"><Trash2 className="h-4 w-4" aria-hidden /> Delete this session</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                <AlertDialogDescription>The session and its tricky words will be removed. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep the session</AlertDialogCancel>
                <AlertDialogAction onClick={deleteSession}>Delete session</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {template && (
        <section className="rounded-2xl border bg-card p-5" aria-label="Session plan">
          <h2 className="text-xl font-semibold">Today's plan · {template.name} ({template.total_minutes} min)</h2>
          <ol className="mt-3 space-y-2">
            {template.blocks.map((b, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl bg-muted px-4 py-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm">{i + 1}</span>
                <span className="font-semibold">{BLOCK_LABELS[b.type] ?? b.type}</span>
                <span className="ml-auto text-sm text-muted-foreground">{b.minutes} min</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {s.status !== COMPLETED_SESSION_STATUS && <QuickRecap childId={s.child_id} />}

      {!s.books && canWrite && s.status !== COMPLETED_SESSION_STATUS && (
        <section className="rounded-2xl border-2 border-story-sun bg-card p-5">
          <h2 className="text-xl font-semibold">Choose a book</h2>
          <p className="mt-1 text-sm text-muted-foreground">This session was started with “Choose later”. Pick the book you're reading today.</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="session-book">Book</Label>
              <select id="session-book" defaultValue="" onChange={(e) => e.target.value && pickBook(e.target.value)} className="min-h-11 w-full rounded-md border bg-background px-3">
                <option value="">Pick a book…</option>
                {books.map((b) => <option key={b.id} value={b.id}>L{b.level} · {b.title}</option>)}
              </select>
            </div>
          </div>
        </section>
      )}

      {s.books && <SessionStory bookId={s.books.id} sessionId={sessionId} title={s.books.title} />}

      <section className="border-t-4 border-story-coral bg-secondary p-5">
        <h2 className="text-xl font-semibold">Tricky words</h2>
        {canWrite && s.status !== COMPLETED_SESSION_STATUS && (
          <form onSubmit={addWord} className="mt-3 flex gap-2">
            <Input aria-label="Tricky word" value={word} onChange={(e) => setWord(e.target.value)} placeholder="Type a word the child found hard" className="min-h-11" />
            <Button type="submit" className="min-h-11">Add</Button>
          </form>
        )}
        <ul className="mt-3 flex flex-wrap gap-2">
          {words.map((w) => (
            <li key={w.id} className="flex items-center gap-1 rounded-full border bg-muted px-3 py-1">
              {editWordId === w.id ? (
                <>
                  <Input aria-label="Correct the word" value={editWordText} onChange={(e) => setEditWordText(e.target.value)} className="h-8 w-28" />
                  <Button size="sm" className="min-h-8" onClick={() => saveWordEdit(w.id)}>Save</Button>
                  <Button size="sm" variant="ghost" className="min-h-8" onClick={() => setEditWordId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <span className={w.mastered ? "line-through text-muted-foreground" : ""}>{w.word}</span>
                  {canWrite && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleMastered(w.id, !w.mastered)}
                        aria-pressed={w.mastered}
                        aria-label={`Mark “${w.word}” as ${w.mastered ? "not learned" : "learned"}`}
                        className={`ml-1 inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-xs font-semibold ${w.mastered ? "bg-primary text-primary-foreground" : "bg-card"}`}
                      >
                        <Check className="h-3 w-3" aria-hidden /> {w.mastered ? "Learned" : "Tick learned"}
                      </button>
                      <button type="button" aria-label={`Correct the spelling of “${w.word}”`} className="inline-flex min-h-8 items-center rounded-full px-2 text-xs" onClick={() => { setEditWordId(w.id); setEditWordText(w.word); }}>
                        <Pencil className="h-3 w-3" aria-hidden />
                      </button>
                    </>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {hf && s.status === COMPLETED_SESSION_STATUS && !editing ? (
        <section className="rounded-2xl border bg-secondary p-5 text-secondary-foreground">
          <h2 className="text-xl font-semibold">Saved notes</h2>
          <p className="mt-2">Engagement {hf.engagement}/5 · Confidence {hf.confidence}/5 · Level: {levelFitLabel(hf.level_fit)} · Finished book: {finishedBookLabel(hf.finished_book)}</p>
          {hf.worked_well && <p className="mt-1"><strong>Worked well:</strong> {hf.worked_well}</p>}
          {hf.try_next && <p className="mt-1"><strong>Try next:</strong> {hf.try_next}</p>}
          {hf.notes && <p className="mt-1">{hf.notes}</p>}
          {isOwner && (
            <Button variant="outline" className="mt-3 min-h-11" onClick={() => {
              setFb({ engagement: hf.engagement, confidence: hf.confidence, level_fit: hf.level_fit, finished_book: hf.finished_book, worked_well: hf.worked_well, try_next: hf.try_next, notes: hf.notes });
              setEditing(true);
            }}>Edit my notes</Button>
          )}
        </section>
      ) : canWrite ? (
        <form onSubmit={finish} className="space-y-4 border-t-4 border-story-sky bg-card p-5">
          <h2 className="text-xl font-semibold">{editing ? "Edit my notes" : "Finish & hand over"}</h2>
          <p className="text-sm text-muted-foreground">Your notes save automatically as you type, so you won't lose them.</p>
          {scale("engagement", "How engaged was the child?")}
          {scale("confidence", "How confident was the child?")}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fit">Was the level right?</Label>
              <select id="fit" value={fb.level_fit} onChange={(e) => updateFb({ ...fb, level_fit: e.target.value })} className="min-h-11 w-full rounded-md border bg-background px-3">
                <option value="too_easy">Too easy</option><option value="about_right">About right</option><option value="too_hard">Too hard</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fin">Finished the book?</Label>
              <select id="fin" value={fb.finished_book} onChange={(e) => updateFb({ ...fb, finished_book: e.target.value })} className="min-h-11 w-full rounded-md border bg-background px-3">
                <option value="yes">Yes</option><option value="partly">Partly</option><option value="no">No</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="ww">What worked well *</Label><Textarea id="ww" required value={fb.worked_well} onChange={(e) => updateFb({ ...fb, worked_well: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tn">Note for the next volunteer *</Label><Textarea id="tn" required value={fb.try_next} onChange={(e) => updateFb({ ...fb, try_next: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="nt">Other short notes (no personal details)</Label><Textarea id="nt" value={fb.notes} onChange={(e) => updateFb({ ...fb, notes: e.target.value })} /></div>
          <Button type="submit" disabled={busy} className="min-h-12 w-full">Save and finish session</Button>
        </form>
      ) : null}

      {blocker.status === "blocked" && (
        <div role="alertdialog" aria-label="Unsaved notes" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold">You have unsaved notes</h2>
            <p className="mt-2 text-sm text-muted-foreground">Your handover notes aren't saved yet. Leave anyway? A draft copy stays on this device.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="min-h-11 flex-1" onClick={() => blocker.reset?.()}>Stay and save</Button>
              <Button variant="destructive" className="min-h-11 flex-1" onClick={() => blocker.proceed?.()}>Leave without saving</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

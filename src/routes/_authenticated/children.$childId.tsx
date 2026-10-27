import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Pencil, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, LEVEL_LABELS } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMPLETED_SESSION_STATUS, sessionStatusLabel } from "@/lib/session-status";
import { levelFitHint } from "@/lib/level-hint";
import { finishedBookLabel, friendlySaveError, levelFitLabel } from "@/lib/labels";
import { pickSuggestions, suggestedLevel, suggestionReason } from "@/lib/book-suggestions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/children/$childId")({
  head: () => ({ meta: [{ title: "Child profile · Read between the Signs" }, { name: "description", content: "Level, tricky words and session history." }, { property: "og:title", content: "Child profile · Read between the Signs" }, { property: "og:description", content: "Level, tricky words and session history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ChildPage,
});

type HF = {
  session_id: string;
  engagement: number;
  confidence: number;
  level_fit: string;
  finished_book: string;
  worked_well: string;
  try_next: string;
  notes: string;
  created_at: string;
};

type SessionRow = {
  id: string;
  scheduled_at: string;
  status: string;
  book_id: string | null;
  books: { title: string } | null;
  profiles: { full_name: string } | null;
  handover_feedback: HF[];
};

const NOTE_GROUPS: { label: string; keywords: string[] }[] = [
  { label: "Level & book fit", keywords: ["level", "easy", "hard", "book"] },
  { label: "Words & signing", keywords: ["word", "sign", "vocabulary", "spell"] },
  { label: "Focus & mood", keywords: ["focus", "tired", "enjoy", "happy", "upset", "engage"] },
];

function groupNotes(notes: (HF & { volunteer: string; date: string })[]) {
  const groups = new Map<string, typeof notes>();
  for (const n of notes) {
    const text = `${n.worked_well} ${n.try_next} ${n.notes}`.toLowerCase();
    const g = NOTE_GROUPS.find((grp) => grp.keywords.some((k) => text.includes(k)));
    const label = g?.label ?? "Other notes";
    groups.set(label, [...(groups.get(label) ?? []), n]);
  }
  return [...groups.entries()];
}

function ChildPage() {
  const { childId } = Route.useParams();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [bookId, setBookId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [levelReason, setLevelReason] = useState("");
  const [editWordId, setEditWordId] = useState<string | null>(null);
  const [editWordText, setEditWordText] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["child", childId],
    queryFn: async () => {
      const [child, sessions, words, books, templates] = await Promise.all([
        supabase.from("children").select("*").eq("id", childId).maybeSingle(),
        supabase.from("sessions").select("id, scheduled_at, status, book_id, books(title), profiles(full_name), handover_feedback(*)").eq("child_id", childId).order("scheduled_at", { ascending: false }),
        supabase.from("tricky_words").select("id, word, mastered").eq("child_id", childId).order("created_at", { ascending: false }),
        supabase.from("books").select("id, title, level, summary").eq("status", "approved").order("level").order("title"),
        supabase.from("session_templates").select("id, name, total_minutes").order("total_minutes"),
      ]);
      return {
        child: child.data,
        sessions: (sessions.data ?? []) as unknown as SessionRow[],
        words: words.data ?? [],
        books: books.data ?? [],
        templates: templates.data ?? [],
      };
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data?.child) return <p>Child not found, or not assigned to you.</p>;
  const { child, sessions, words, books, templates } = data;

  const allHfs = sessions.flatMap((s) => s.handover_feedback);
  const recentFits = sessions
    .filter((s) => s.status === COMPLETED_SESSION_STATUS && s.handover_feedback.length > 0)
    .map((s) => s.handover_feedback[0].level_fit);
  const fitHint = levelFitHint(recentFits);
  const inProgress = sessions.find((s) => s.status === "in_progress");

  const readBookIds = new Set(sessions.filter((s) => s.book_id).map((s) => s.book_id as string));
  const targetLevel = suggestedLevel(child.current_level, recentFits);
  const suggestions = pickSuggestions(books, readBookIds, targetLevel);
  const reason = suggestionReason(child.current_level, recentFits);

  const notes = sessions
    .filter((s) => s.handover_feedback.length > 0)
    .map((s) => ({
      ...s.handover_feedback[0],
      volunteer: s.profiles?.full_name ?? "A volunteer",
      date: new Date(s.scheduled_at).toLocaleDateString(),
    }));
  const lastNote = notes.find((n) => n.try_next || n.notes);

  async function changeLevel() {
    const level = newLevel || child!.current_level;
    if (level === child!.current_level) { toast.error("Pick a different level first."); return; }
    setBusy(true);
    const { error } = await supabase.rpc("change_child_level", { _child_id: childId, _new_level: level, _reason: levelReason });
    setBusy(false);
    if (error) { toast.error(friendlySaveError(error.message)); return; }
    toast.success(`Level updated to ${level} (${LEVEL_LABELS[level]}).`);
    setLevelReason("");
    setNewLevel(0);
    qc.invalidateQueries({ queryKey: ["child", childId] });
  }

  async function start() {
    if (!me || inProgress) return;
    setBusy(true);
    const { data: s, error } = await supabase
      .from("sessions")
      .insert({ child_id: childId, volunteer_id: me.id, book_id: bookId || null, template_id: templateId || null, status: "in_progress" })
      .select("id")
      .single();
    setBusy(false);
    if (error) { toast.error(friendlySaveError(error.message)); return; }
    navigate({ to: "/sessions/$sessionId", params: { sessionId: s.id } });
  }

  async function toggleMastered(id: string, mastered: boolean) {
    const { error } = await supabase.from("tricky_words").update({ mastered }).eq("id", id);
    if (error) { toast.error(friendlySaveError(error.message)); return; }
    qc.invalidateQueries({ queryKey: ["child", childId] });
  }

  async function saveWordEdit(id: string) {
    const text = editWordText.trim();
    if (!text) return;
    const { error } = await supabase.from("tricky_words").update({ word: text }).eq("id", id);
    if (error) { toast.error(friendlySaveError(error.message)); return; }
    setEditWordId(null);
    qc.invalidateQueries({ queryKey: ["child", childId] });
  }

  const noteCard = (n: (typeof notes)[number]) => (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm font-semibold">{n.date} · {n.volunteer}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Engagement {n.engagement}/5 · Confidence {n.confidence}/5 · Level: {levelFitLabel(n.level_fit)} · Finished book: {finishedBookLabel(n.finished_book)}
      </p>
      {n.worked_well && <p className="mt-2 text-sm"><strong>Worked well:</strong> {n.worked_well}</p>}
      {n.try_next && <p className="mt-1 text-sm"><strong>Try next:</strong> {n.try_next}</p>}
      {n.notes && <p className="mt-1 text-sm">{n.notes}</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back
      </Link>
      <header>
        <h1 className="text-3xl font-bold">{child.nickname}</h1>
        <p className="mt-1 text-muted-foreground">Age {child.age_band} · Level {child.current_level} ({LEVEL_LABELS[child.current_level]})</p>
        {child.communication_notes && <p className="mt-3 rounded-xl bg-muted p-3">{child.communication_notes}</p>}
      </header>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-semibold">Reading level</h2>
        {fitHint && <p className="mt-1 text-sm font-semibold text-primary">{fitHint}</p>}
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-level">New level</Label>
            <select id="new-level" value={newLevel || child.current_level} onChange={(e) => setNewLevel(Number(e.target.value))} className="min-h-11 rounded-md border bg-background px-3">
              {[1, 2, 3].map((l) => <option key={l} value={l}>Level {l} · {LEVEL_LABELS[l]}</option>)}
            </select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="level-reason">Short reason</Label>
            <Input id="level-reason" value={levelReason} onChange={(e) => setLevelReason(e.target.value)} placeholder="e.g. Last two books felt too easy" className="min-h-11" />
          </div>
          <Button variant="outline" className="min-h-11" disabled={busy} onClick={changeLevel}>Update level</Button>
        </div>
      </section>

      {lastNote && (
        <section className="rounded-2xl border-2 border-accent bg-secondary p-5 text-secondary-foreground">
          <h2 className="font-semibold">Note from the last volunteer · {lastNote.volunteer}</h2>
          <p className="mt-1 text-sm">Level: {levelFitLabel(lastNote.level_fit)} · Finished book: {finishedBookLabel(lastNote.finished_book)}</p>
          {lastNote.try_next && <p className="mt-1"><strong>Try next:</strong> {lastNote.try_next}</p>}
          {lastNote.notes && <p className="mt-1">{lastNote.notes}</p>}
        </section>
      )}

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-semibold">Start a session</h2>
        {inProgress ? (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">A session is already in progress for {child.nickname}.</p>
            <Button className="mt-2 min-h-11" onClick={() => navigate({ to: "/sessions/$sessionId", params: { sessionId: inProgress.id } })}>
              <Play className="h-4 w-4" aria-hidden /> Continue the session from {new Date(inProgress.scheduled_at).toLocaleDateString()}
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="book">Book</Label>
                <select id="book" value={bookId} onChange={(e) => setBookId(e.target.value)} className="min-h-11 w-full rounded-md border bg-background px-3">
                  <option value="">Choose later</option>
                  {books.map((b) => <option key={b.id} value={b.id}>L{b.level} · {b.title}</option>)}
                </select>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="template">Session length</Label>
                <select id="template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="min-h-11 w-full rounded-md border bg-background px-3">
                  <option value="">No set plan</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.total_minutes} min</option>)}
                </select>
              </div>
            </div>
            <Button className="min-h-11" disabled={busy} onClick={start}><Play className="h-4 w-4" aria-hidden /> {busy ? "Starting…" : "Start session"}</Button>
          </div>
        )}
      </section>

      {suggestions.length > 0 && (
        <section className="rounded-2xl border-2 border-story-sun bg-card p-5">
          <h2 className="text-xl font-semibold">Suggested books for {child.nickname}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {suggestions.map((b) => (
              <li key={b.id}>
                <Link to="/library/$bookId" params={{ bookId: b.id }} className="block h-full rounded-xl border bg-background p-4 hover:border-primary">
                  <p className="font-semibold">L{b.level} · {b.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{b.summary}</p>
                  <p className="mt-2 text-xs font-semibold text-primary">{reason}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold">Tricky words</h2>
        {words.length === 0 ? <p className="mt-2 text-muted-foreground">None yet.</p> : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {words.map((w) => (
              <li key={w.id} className="flex items-center gap-1 rounded-full border bg-card px-3 py-1">
                {editWordId === w.id ? (
                  <>
                    <Input aria-label="Correct the word" value={editWordText} onChange={(e) => setEditWordText(e.target.value)} className="h-8 w-28" />
                    <Button size="sm" className="min-h-8" onClick={() => saveWordEdit(w.id)}>Save</Button>
                    <Button size="sm" variant="ghost" className="min-h-8" onClick={() => setEditWordId(null)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <span className={w.mastered ? "line-through text-muted-foreground" : ""}>{w.word}</span>
                    <button
                      type="button"
                      onClick={() => toggleMastered(w.id, !w.mastered)}
                      aria-pressed={w.mastered}
                      aria-label={`Mark “${w.word}” as ${w.mastered ? "not learned" : "learned"}`}
                      className={cn("ml-1 inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-xs font-semibold", w.mastered ? "bg-primary text-primary-foreground" : "bg-muted")}
                    >
                      <Check className="h-3 w-3" aria-hidden /> {w.mastered ? "Learned" : "Tick learned"}
                    </button>
                    <button type="button" aria-label={`Correct the spelling of “${w.word}”`} className="inline-flex min-h-8 items-center rounded-full px-2 text-xs" onClick={() => { setEditWordId(w.id); setEditWordText(w.word); }}>
                      <Pencil className="h-3 w-3" aria-hidden />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {notes.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">All notes from volunteers</h2>
          {notes.length <= 6 ? (
            <ul className="mt-3 space-y-3">{notes.map((n, i) => <li key={i}>{noteCard(n)}</li>)}</ul>
          ) : (
            <div className="mt-3 space-y-4">
              {groupNotes(notes).map(([label, group]) => (
                <details key={label} className="rounded-2xl border bg-card p-4" open={label === "Other notes"}>
                  <summary className="min-h-11 cursor-pointer font-semibold">{label} ({group.length})</summary>
                  <ul className="mt-3 space-y-3">{group.map((n, i) => <li key={i}>{noteCard(n)}</li>)}</ul>
                </details>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold">Session history</h2>
        {sessions.length === 0 ? <p className="mt-2 text-muted-foreground">No sessions yet.</p> : (
          <ul className="mt-3 space-y-2">
            {sessions.map((s) => {
              const hf = s.handover_feedback[0];
              return (
                <li key={s.id}>
                  <Link to="/sessions/$sessionId" params={{ sessionId: s.id }} className="block rounded-xl border bg-card p-4 hover:border-primary">
                    <p className="font-semibold">{new Date(s.scheduled_at).toLocaleDateString()} · {s.books?.title ?? "No book"}</p>
                    <p className="text-sm text-muted-foreground">
                      {sessionStatusLabel(s.status)} · {s.profiles?.full_name ?? "A volunteer"}
                      {hf && ` · Engagement ${hf.engagement}/5 · Confidence ${hf.confidence}/5 · Level: ${levelFitLabel(hf.level_fit)}`}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {allHfs.length === 0 && null}
    </div>
  );
}

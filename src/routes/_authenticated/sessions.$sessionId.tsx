import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StoryReader } from "@/components/StoryReader";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
  head: () => ({ meta: [{ title: "Session · CODA Reading Toolkit" }, { name: "description", content: "Run a reading session and save notes." }, { property: "og:title", content: "Session · CODA Reading Toolkit" }, { property: "og:description", content: "Run a reading session and save notes." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();
  const qc = useQueryClient();
  const [word, setWord] = useState("");
  const [fb, setFb] = useState({ engagement: 3, confidence: 3, level_fit: "right", finished_book: "yes", worked_well: "", try_next: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const key = ["session", sessionId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: s } = await supabase.from("sessions").select("*, children(id, nickname), books(id, title, link_url)").eq("id", sessionId).maybeSingle();
      const [{ data: words }, { data: hf }] = await Promise.all([
        supabase.from("tricky_words").select("id, word").eq("session_id", sessionId),
        supabase.from("handover_feedback").select("*").eq("session_id", sessionId).maybeSingle(),
      ]);
      return { s, words: words ?? [], hf };
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data?.s) return <p>Session not found.</p>;
  const { s, words, hf } = data;

  async function addWord(e: FormEvent) {
    e.preventDefault();
    if (!word.trim() || !s) return;
    const { error } = await supabase.from("tricky_words").insert({ child_id: s.child_id, session_id: sessionId, word: word.trim() });
    if (error) { toast.error(error.message); return; }
    setWord("");
    qc.invalidateQueries({ queryKey: key });
  }

  async function finish(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("handover_feedback").insert({ session_id: sessionId, ...fb });
    if (!error) await supabase.from("sessions").update({ status: "done" }).eq("id", sessionId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Session saved for the next volunteer.");
    qc.invalidateQueries();
  }

  const scale = (k: "engagement" | "confidence", label: string) => (
    <fieldset>
      <legend className="text-sm font-semibold">{label} (1–5)</legend>
      <div className="mt-1 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} aria-pressed={fb[k] === n} onClick={() => setFb({ ...fb, [k]: n })}
            className={`h-11 w-11 rounded-lg border font-semibold ${fb[k] === n ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{n}</button>
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
        <p className="mt-1 text-muted-foreground">{new Date(s.scheduled_at).toLocaleString()} · {s.status === "done" ? "Finished" : "In progress"}</p>
        {s.books && (
          <p className="mt-2">Book: <Link to="/library/$bookId" params={{ bookId: s.books.id }} className="font-semibold text-primary underline">{s.books.title}</Link> (key words & prompts)</p>
        )}
      </header>

      {s.books && <StoryReader bookId={s.books.id} title={s.books.title} externalUrl={s.books.link_url} />}

      <section className="border-t-4 border-story-coral bg-secondary p-5">
        <h2 className="text-xl font-semibold">Tricky words</h2>
        <form onSubmit={addWord} className="mt-3 flex gap-2">
          <Input aria-label="Tricky word" value={word} onChange={(e) => setWord(e.target.value)} placeholder="Type a word the child found hard" className="min-h-11" />
          <Button type="submit" className="min-h-11">Add</Button>
        </form>
        <ul className="mt-3 flex flex-wrap gap-2">{words.map((w) => <li key={w.id} className="rounded-full border bg-muted px-3 py-1">{w.word}</li>)}</ul>
      </section>

      {hf ? (
        <section className="rounded-2xl border bg-secondary p-5 text-secondary-foreground">
          <h2 className="text-xl font-semibold">Saved notes</h2>
          <p className="mt-2">Engagement {hf.engagement}/5 · Confidence {hf.confidence}/5 · Level: {hf.level_fit} · Finished book: {hf.finished_book}</p>
          {hf.worked_well && <p className="mt-1"><strong>Worked well:</strong> {hf.worked_well}</p>}
          {hf.try_next && <p className="mt-1"><strong>Try next:</strong> {hf.try_next}</p>}
          {hf.notes && <p className="mt-1">{hf.notes}</p>}
        </section>
      ) : (
        <form onSubmit={finish} className="space-y-4 border-t-4 border-story-sky bg-card p-5">
          <h2 className="text-xl font-semibold">Finish & hand over</h2>
          {scale("engagement", "How engaged was the child?")}
          {scale("confidence", "How confident was the child?")}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fit">Was the level right?</Label>
              <select id="fit" value={fb.level_fit} onChange={(e) => setFb({ ...fb, level_fit: e.target.value })} className="min-h-11 w-full rounded-md border bg-background px-3">
                <option value="too_easy">Too easy</option><option value="right">About right</option><option value="too_hard">Too hard</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fin">Finished the book?</Label>
              <select id="fin" value={fb.finished_book} onChange={(e) => setFb({ ...fb, finished_book: e.target.value })} className="min-h-11 w-full rounded-md border bg-background px-3">
                <option value="yes">Yes</option><option value="partly">Partly</option><option value="no">No</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="ww">What worked well</Label><Textarea id="ww" value={fb.worked_well} onChange={(e) => setFb({ ...fb, worked_well: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tn">Note for the next volunteer</Label><Textarea id="tn" value={fb.try_next} onChange={(e) => setFb({ ...fb, try_next: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="nt">Other short notes (no personal details)</Label><Textarea id="nt" value={fb.notes} onChange={(e) => setFb({ ...fb, notes: e.target.value })} /></div>
          <Button type="submit" disabled={busy} className="min-h-12 w-full">Save and finish session</Button>
        </form>
      )}
    </div>
  );
}

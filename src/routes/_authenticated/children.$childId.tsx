import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, LEVEL_LABELS } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { sessionStatusLabel } from "@/lib/session-status";

export const Route = createFileRoute("/_authenticated/children/$childId")({
  head: () => ({ meta: [{ title: "Child profile · Read between the Signs" }, { name: "description", content: "Level, tricky words and session history." }, { property: "og:title", content: "Child profile · Read between the Signs" }, { property: "og:description", content: "Level, tricky words and session history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ChildPage,
});

function ChildPage() {
  const { childId } = Route.useParams();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [bookId, setBookId] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["child", childId],
    queryFn: async () => {
      const [child, sessions, words, books] = await Promise.all([
        supabase.from("children").select("*").eq("id", childId).maybeSingle(),
        supabase.from("sessions").select("id, scheduled_at, status, books(title), handover_feedback(try_next, notes, worked_well)").eq("child_id", childId).order("scheduled_at", { ascending: false }),
        supabase.from("tricky_words").select("id, word, mastered").eq("child_id", childId).order("created_at", { ascending: false }),
        supabase.from("books").select("id, title, level").order("level").order("title"),
      ]);
      return { child: child.data, sessions: sessions.data ?? [], words: words.data ?? [], books: books.data ?? [] };
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data?.child) return <p>Child not found, or not assigned to you.</p>;
  const { child, sessions, words, books } = data;
  const lastNote = sessions.flatMap((s) => hfList(s.handover_feedback)).find((h) => h.try_next || h.notes);

  async function start() {
    if (!me) return;
    setBusy(true);
    const { data: s, error } = await supabase
      .from("sessions")
      .insert({ child_id: childId, volunteer_id: me.id, book_id: bookId || null, status: "in_progress" })
      .select("id")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/sessions/$sessionId", params: { sessionId: s.id } });
  }

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

      {lastNote && (
        <section className="rounded-2xl border-2 border-accent bg-secondary p-5 text-secondary-foreground">
          <h2 className="font-semibold">Note from the last volunteer</h2>
          {lastNote.try_next && <p className="mt-1"><strong>Try next:</strong> {lastNote.try_next}</p>}
          {lastNote.notes && <p className="mt-1">{lastNote.notes}</p>}
        </section>
      )}

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-semibold">Start a session</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="book">Book</Label>
            <select id="book" value={bookId} onChange={(e) => setBookId(e.target.value)} className="min-h-11 w-full rounded-md border bg-background px-3">
              <option value="">Choose later</option>
              {books.map((b) => <option key={b.id} value={b.id}>L{b.level} · {b.title}</option>)}
            </select>
          </div>
          <Button className="min-h-11" disabled={busy} onClick={start}><Play className="h-4 w-4" aria-hidden /> Start session</Button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Tricky words</h2>
        {words.length === 0 ? <p className="mt-2 text-muted-foreground">None yet.</p> : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {words.map((w) => <li key={w.id} className={`rounded-full border px-3 py-1 ${w.mastered ? "line-through text-muted-foreground" : "bg-card"}`}>{w.word}</li>)}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Session history</h2>
        {sessions.length === 0 ? <p className="mt-2 text-muted-foreground">No sessions yet.</p> : (
          <ul className="mt-3 space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link to="/sessions/$sessionId" params={{ sessionId: s.id }} className="block rounded-xl border bg-card p-4 hover:border-primary">
                  <p className="font-semibold">{new Date(s.scheduled_at).toLocaleDateString()} · {s.books?.title ?? "No book"}</p>
                  <p className="text-sm text-muted-foreground">{sessionStatusLabel(s.status)}{hfList(s.handover_feedback)[0]?.worked_well ? ` · ${hfList(s.handover_feedback)[0]?.worked_well}` : ""}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type HF = { notes: string; try_next: string; worked_well: string };
function hfList(h: HF | HF[] | null | undefined): HF[] {
  return h ? (Array.isArray(h) ? h : [h]) : [];
}

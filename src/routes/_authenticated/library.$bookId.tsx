import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ExternalLink, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { LevelBadge } from "@/components/LevelBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/library/$bookId")({
  head: () => ({ meta: [{ title: "Book · CODA Reading Toolkit" }, { name: "description", content: "Key words and discussion prompts for this book." }, { property: "og:title", content: "Book · CODA Reading Toolkit" }, { property: "og:description", content: "Key words and discussion prompts for this book." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: BookDetail,
});

const CROWD: Record<string, { label: string; hint: string }> = {
  completion: { label: "Completion", hint: "Child fills in the blank" },
  recall: { label: "Recall", hint: "Remember what happened" },
  open_ended: { label: "Open-ended", hint: "Describe in their own words" },
  wh: { label: "Wh- question", hint: "What, where, who, why" },
  distancing: { label: "Distancing", hint: "Link to the child's own life" },
};
const POINTS = ["beginning", "middle", "end"] as const;

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-SG";
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

function BookDetail() {
  const { bookId } = Route.useParams();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [link, setLink] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => {
      const [book, words, prompts] = await Promise.all([
        supabase.from("books").select("*").eq("id", bookId).maybeSingle(),
        supabase.from("word_cards").select("*").eq("book_id", bookId).order("sort_order"),
        supabase.from("discussion_prompts").select("*").eq("book_id", bookId),
      ]);
      return { book: book.data, words: words.data ?? [], prompts: prompts.data ?? [] };
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data?.book) return <p>Book not found, or you don't have access yet.</p>;
  const { book, words, prompts } = data;
  const card = openIdx !== null ? words[openIdx] : null;

  return (
    <div className="space-y-8">
      <Link to="/library" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to library
      </Link>
      <header>
        <LevelBadge level={book.level} />
        <h1 className="mt-3 text-3xl font-bold">{book.title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{book.summary}</p>
        <p className="mt-2 text-sm text-muted-foreground">{book.author} · {book.reading_time} min · {book.tags.join(", ")}</p>
        {book.link_url ? (
          <Button asChild className="mt-4 min-h-12"><a href={book.link_url} target="_blank" rel="noreferrer">Open the book <ExternalLink className="h-4 w-4" aria-hidden /></a></Button>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No link to the book yet.</p>
        )}
        {me?.isAdmin && (
          <form className="mt-3 flex gap-2" onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase.from("books").update({ link_url: link || null }).eq("id", bookId);
            if (error) { toast.error(error.message); return; }
            toast.success("Book link saved");
            qc.invalidateQueries({ queryKey: ["book", bookId] });
          }}>
            <Input aria-label="Link to the book" type="url" placeholder="Paste a link to the book (library, publisher, e-book)" value={link} onChange={(e) => setLink(e.target.value)} className="min-h-11" />
            <Button type="submit" variant="outline" className="min-h-11">Save link</Button>
          </form>
        )}
      </header>

      <section>
        <h2 className="text-xl font-semibold">Key words</h2>
        <p className="text-sm text-muted-foreground">Tap a word to open its card and go through it with the child.</p>
        <ul className="mt-3 flex flex-wrap gap-3">
          {words.map((w, i) => (
            <li key={w.id}>
              <button onClick={() => setOpenIdx(i)} className="min-h-14 rounded-2xl border-2 bg-card px-5 font-heading text-lg font-semibold hover:border-primary">
                {w.word}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Discussion prompts (CROWD)</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {POINTS.map((p) => (
            <div key={p}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{p}</h3>
              <ul className="mt-2 space-y-2">
                {prompts.filter((x) => x.story_point === p).map((x) => (
                  <li key={x.id} className="rounded-xl border bg-card p-4">
                    <p className="text-xs font-bold text-primary">{CROWD[x.crowd_type]?.label} <span className="font-normal text-muted-foreground">· {CROWD[x.crowd_type]?.hint}</span></p>
                    <p className="mt-1">{x.prompt_text}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Dialog open={!!card} onOpenChange={(o) => !o && setOpenIdx(null)}>
        <DialogContent className="max-w-lg rounded-3xl">
          {card && (
            <div className="space-y-5 text-center">
              <DialogTitle className="font-heading text-5xl font-bold text-primary">{card.word}</DialogTitle>
              <p className="text-lg text-muted-foreground">/{card.pronunciation}/</p>
              <Button variant="secondary" className="min-h-12" onClick={() => speak(card.word)}>
                <Volume2 className="h-5 w-5" aria-hidden /> Hear it
              </Button>
              <DialogDescription className="text-xl text-foreground">{card.definition}</DialogDescription>
              <p className="rounded-2xl bg-muted p-4 text-lg italic">"{card.example_sentence}"</p>
              {card.sign_bank_url && (
                <a href={card.sign_bank_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline">
                  See the sign on SignASL.org <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              )}
              <div className="flex justify-between gap-2">
                <Button variant="outline" className="min-h-12 flex-1" disabled={openIdx === 0} onClick={() => setOpenIdx((i) => (i ?? 1) - 1)}>Previous</Button>
                <Button className="min-h-12 flex-1" disabled={openIdx === words.length - 1} onClick={() => setOpenIdx((i) => (i ?? 0) + 1)}>Next</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

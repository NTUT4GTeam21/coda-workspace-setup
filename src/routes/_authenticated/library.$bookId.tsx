import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { LevelBadge } from "@/components/LevelBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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

type WordCard = {
  id: string;
  word: string;
  definition: string;
  pronunciation: string;
  example_sentence: string;
  sign_bank_url: string | null;
  sgsl_url: string | null;
  sgsl_manual: boolean;
  sgsl_checked_at: string | null;
  sgsl_candidates: string[];
};
type Prompt = { id: string; prompt_text: string };
import { StoryReader } from "@/components/StoryReader";
import { WordCardDialog } from "@/components/WordCardDialog";
import { useServerFn } from "@tanstack/react-start";
import { saveSgslWordCard } from "@/lib/sgsl.functions";
import { sgslUrl } from "@/lib/sgsl";

export const Route = createFileRoute("/_authenticated/library/$bookId")({
  head: () => ({ meta: [{ title: "Book · Read between the Signs" }, { name: "description", content: "Key words and discussion prompts for this book." }, { property: "og:title", content: "Book · Read between the Signs" }, { property: "og:description", content: "Key words and discussion prompts for this book." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
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

function BookDetail() {
  const { bookId } = Route.useParams();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [link, setLink] = useState("");
  const [editWord, setEditWord] = useState<WordCard | null>(null);
  const [editPrompt, setEditPrompt] = useState<Prompt | null>(null);
  const [savingWord, setSavingWord] = useState(false);
  const [override, setOverride] = useState("");
  const openEditor = (w: WordCard) => { setEditWord(w); setOverride(w.sgsl_manual ? w.sgsl_url ?? "" : ""); };
  const saveWordFn = useServerFn(saveSgslWordCard);

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

  // Pre-fill the link box with the book's current link once it loads.
  useEffect(() => {
    if (data?.book) setLink(data.book.link_url ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.book?.id]);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data?.book) return <p>Book not found, or you don't have access yet.</p>;
  const { book, words, prompts } = data;

  async function saveLink(url: string | null) {
    const { error } = await supabase.from("books").update({ link_url: url }).eq("id", bookId);
    if (error) { toast.error(error.message); return; }
    toast.success(url ? "Book link saved" : "Book link removed");
    qc.invalidateQueries({ queryKey: ["book", bookId] });
  }

  async function saveWord() {
    if (!editWord) return;
    setSavingWord(true);
    try {
      const res = await saveWordFn({ data: {
        id: editWord.id, bookId,
        word: editWord.word.trim(),
        definition: editWord.definition.trim(),
        pronunciation: editWord.pronunciation.trim(),
        example_sentence: editWord.example_sentence.trim(),
        sign_bank_url: editWord.sign_bank_url?.trim() || null,
        // Empty override keeps the automatic result; clearing a manual one re-checks.
        sgsl_url: override.trim() || (editWord.sgsl_manual ? null : editWord.sgsl_url),
      } });
      toast.success(res.result === "failed" ? "Word card saved. The SgSL check couldn't finish – try again later." : "Word card saved");
      setEditWord(null);
      qc.invalidateQueries({ queryKey: ["book", bookId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Word card could not be saved.");
    } finally {
      setSavingWord(false);
    }
  }

  async function savePrompt() {
    if (!editPrompt) return;
    const { error } = await supabase.from("discussion_prompts").update({ prompt_text: editPrompt.prompt_text.trim() }).eq("id", editPrompt.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Prompt saved");
    setEditPrompt(null);
    qc.invalidateQueries({ queryKey: ["book", bookId] });
  }

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
        {me?.isAdmin && (
          <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); saveLink(link.trim() || null); }}>
            <Input aria-label="Link to the book" type="url" placeholder="Paste a link to the book (library, publisher, e-book)" value={link} onChange={(e) => setLink(e.target.value)} className="min-h-11 flex-1" />
            <Button type="submit" variant="outline" className="min-h-11">Save link</Button>
            {book.link_url && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" className="min-h-11 text-destructive">Remove link</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove the book link?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Volunteers will no longer see a link for “{book.title}”. You can paste a new link later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep the link</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { setLink(""); saveLink(null); }}>Remove link</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </form>
        )}
      </header>

      <StoryReader bookId={bookId} title={book.title} externalUrl={book.link_url} />

      <section>
        <h2 className="text-xl font-semibold">Key words</h2>
        <p className="text-sm text-muted-foreground">Tap a word to open its card and go through it with the child.</p>
        <ul className="mt-3 flex flex-wrap gap-3">
          {words.map((w, i) => (
            <li key={w.id} className="flex items-center gap-1">
              <Button variant="outline" onClick={() => setOpenIdx(i)} className="min-h-14 rounded-lg border-2 bg-story-sun px-5 font-heading text-lg font-semibold text-story-ink hover:border-primary">
                {w.word}
              </Button>
              {me?.isAdmin && (
                <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={`Edit word card ${w.word}`} onClick={() => openEditor(w)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
              )}
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
                    {me?.isAdmin && (
                      <Button variant="ghost" size="sm" className="mt-2 min-h-11" onClick={() => setEditPrompt(x)}>
                        <Pencil className="h-4 w-4" aria-hidden /> Edit prompt
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <WordCardDialog cards={words} openIdx={openIdx} onClose={() => setOpenIdx(null)} onNavigate={setOpenIdx} />

      <Dialog open={!!editWord} onOpenChange={(o) => !o && setEditWord(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Edit word card</DialogTitle>
          <DialogDescription>Changes save for everyone after staff review.</DialogDescription>
          {editWord && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ew-word">Word</Label>
                <Input id="ew-word" value={editWord.word} onChange={(e) => setEditWord({ ...editWord, word: e.target.value })} className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ew-pron">Pronunciation</Label>
                <Input id="ew-pron" value={editWord.pronunciation} onChange={(e) => setEditWord({ ...editWord, pronunciation: e.target.value })} className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ew-def">Definition</Label>
                <Textarea id="ew-def" value={editWord.definition} onChange={(e) => setEditWord({ ...editWord, definition: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ew-ex">Example sentence</Label>
                <Textarea id="ew-ex" value={editWord.example_sentence} onChange={(e) => setEditWord({ ...editWord, example_sentence: e.target.value })} />
              </div>
              <SgslStatus card={editWord} onUse={setOverride} />
              <div className="space-y-1.5">
                <Label htmlFor="ew-sgsl">SgSL sign link (override)</Label>
                <Input id="ew-sgsl" type="url" value={override} placeholder="Leave empty to use the automatic check" onChange={(e) => setOverride(e.target.value)} className="min-h-11" />
                <p className="text-xs text-muted-foreground">Clearing this switches back to the automatic SgSL check.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ew-sign">ASL sign link (fallback)</Label>
                <Input id="ew-sign" type="url" value={editWord.sign_bank_url ?? ""} onChange={(e) => setEditWord({ ...editWord, sign_bank_url: e.target.value })} className="min-h-11" />
              </div>
              <Button className="min-h-11 w-full" onClick={saveWord} disabled={savingWord}>{savingWord ? "Saving and checking SgSL…" : "Save word card"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPrompt} onOpenChange={(o) => !o && setEditPrompt(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Edit discussion prompt</DialogTitle>
          {editPrompt && (
            <div className="space-y-3">
              <Textarea aria-label="Prompt text" rows={4} value={editPrompt.prompt_text} onChange={(e) => setEditPrompt({ ...editPrompt, prompt_text: e.target.value })} />
              <Button className="min-h-11 w-full" onClick={savePrompt}>Save prompt</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SgslStatus({ card, onUse }: { card: WordCard; onUse: (url: string) => void }) {
  const box = "rounded-xl border bg-muted/40 p-3 text-sm";
  if (card.sgsl_url) {
    return (
      <div className={box}>
        <p className="font-semibold">SgSL sign found{card.sgsl_manual ? " (set by staff)" : ""}</p>
        <a href={card.sgsl_url} target="_blank" rel="noreferrer" className="break-all text-primary underline">{card.sgsl_url}</a>
      </div>
    );
  }
  if (card.sgsl_candidates.length) {
    return (
      <div className={box}>
        <p className="font-semibold">Possible SgSL match – needs staff review</p>
        <ul className="mt-2 space-y-2">
          {card.sgsl_candidates.map((c) => (
            <li key={c} className="flex flex-wrap items-center justify-between gap-2">
              <a href={sgslUrl(c)} target="_blank" rel="noreferrer" className="text-primary underline">{c}</a>
              <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => onUse(sgslUrl(c))}>Use this sign</Button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (card.sgsl_checked_at) {
    return <p className={box}>No SgSL sign found (checked {new Date(card.sgsl_checked_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })})</p>;
  }
  return <p className={box}>Not checked yet</p>;
}

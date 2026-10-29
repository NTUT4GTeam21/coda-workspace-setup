import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, MessageCircleQuestion, Minus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WordCardDialog, type WordCardData } from "@/components/WordCardDialog";
import { buildQuiz, type QuizQuestion } from "@/lib/quiz-builder";
import { friendlySaveError } from "@/lib/labels";
import { cn } from "@/lib/utils";

const CROWD: Record<string, string> = {
  completion: "Completion",
  recall: "Recall",
  open_ended: "Open-ended",
  wh: "Wh- question",
  distancing: "Distancing",
};

type Prompt = { id: string; prompt_text: string; crowd_type: string; story_point: string };

/** Underline key words in a paragraph; clicking one opens the shared word-card pop-up. */
function StoryText({ text, words, onWord }: { text: string; words: WordCardData[]; onWord: (idx: number) => void }) {
  const parts = useMemo(() => {
    if (words.length === 0) return [{ text, wordIdx: -1 }];
    const pattern = new RegExp(
      `\\b(${words.map((w) => w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
      "gi",
    );
    const out: { text: string; wordIdx: number }[] = [];
    let last = 0;
    for (const m of text.matchAll(pattern)) {
      const i = m.index ?? 0;
      if (i > last) out.push({ text: text.slice(last, i), wordIdx: -1 });
      const wordIdx = words.findIndex((w) => w.word.toLowerCase() === m[0].toLowerCase());
      out.push({ text: m[0], wordIdx });
      last = i + m[0].length;
    }
    if (last < text.length) out.push({ text: text.slice(last), wordIdx: -1 });
    return out;
  }, [text, words]);

  return (
    <p className="min-h-36 whitespace-pre-line font-heading text-xl leading-relaxed sm:text-2xl">
      {parts.map((p, i) =>
        p.wordIdx >= 0 ? (
          <button
            key={i}
            type="button"
            onClick={() => onWord(p.wordIdx)}
            className="font-bold text-primary underline decoration-wavy decoration-2 underline-offset-4 hover:bg-story-sun/60 rounded"
          >
            {p.text}
          </button>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  );
}

function Quiz({ questions, sessionId, canWrite }: { questions: QuizQuestion[]; sessionId: string; canWrite: boolean }) {
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["quiz-results", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from("quiz_results").select("*").eq("session_id", sessionId).order("created_at");
      return data ?? [];
    },
  });

  if (existing && existing.length > 0) {
    return (
      <section className="rounded-2xl border-2 border-story-sky bg-card p-5" aria-label="Story quiz results">
        <h3 className="font-heading text-xl font-bold">Story quiz — saved answers</h3>
        <ul className="mt-3 space-y-3">
          {existing.map((r) => (
            <li key={r.id} className="rounded-xl border bg-secondary p-4 text-secondary-foreground">
              <p className="font-semibold">{r.question}</p>
              <p className="mt-1 text-sm">Child's answer: <strong>{r.child_answer}</strong></p>
              <p className="text-sm">Correct answer: <strong>{r.correct_answer}</strong></p>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (!canWrite) return null;

  const allAnswered = questions.every((_, i) => (answers[i] ?? "").trim());

  async function save() {
    if (busy) return;
    setBusy(true);
    const rows = questions.map((q, i) => ({
      session_id: sessionId,
      question: q.question,
      child_answer: (answers[i] ?? "").trim(),
      correct_answer: q.correctAnswer,
      word: q.word,
    }));
    const { error } = await supabase.from("quiz_results").insert(rows);
    setBusy(false);
    if (error) { toast.error(friendlySaveError(error.message)); return; }
    setSaved(true);
    toast.success("Quiz answers saved to this session.");
    qc.invalidateQueries({ queryKey: ["quiz-results", sessionId] });
  }

  return (
    <section className="rounded-2xl border-2 border-story-coral bg-card p-5" aria-label="Story quiz">
      <h3 className="font-heading text-xl font-bold">Story quiz</h3>
      <p className="mt-1 text-sm text-muted-foreground">Do these together. There's no score — it's about talking, not testing.</p>
      <ol className="mt-4 space-y-5">
        {questions.map((q, i) => {
          const chosen = answers[i];
          return (
            <li key={i} className="rounded-xl border bg-background p-4">
              <p className="font-semibold">{i + 1}. {q.question}</p>
              {q.options.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Answers for question ${i + 1}`}>
                  {q.options.map((opt) => (
                    <Button
                      key={opt}
                      type="button"
                      variant={chosen === opt ? "default" : "outline"}
                      className="min-h-11"
                      aria-pressed={chosen === opt}
                      disabled={saved}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: opt }))}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              ) : (
                <Textarea
                  aria-label={`Answer for question ${i + 1}`}
                  className="mt-3"
                  placeholder="Write down what the child said…"
                  value={chosen ?? ""}
                  disabled={saved}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                />
              )}
              {saved && chosen && (
                <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                  <p>Child's answer: <strong>{chosen}</strong></p>
                  <p>Correct answer: <strong>{q.correctAnswer}</strong></p>
                  <p className="mt-1 text-muted-foreground">{q.explanation}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {!saved && (
        <Button className="mt-4 min-h-12 w-full" disabled={!allAnswered || busy} onClick={save}>
          {busy ? "Saving…" : "Save quiz answers"}
        </Button>
      )}
    </section>
  );
}

/**
 * The in-session reading experience: the story with tappable key words, the
 * CROWD prompts under the story and in a floating panel, and the end quiz.
 */
export function SessionStory({ bookId, sessionId, title, canWrite = false }: { bookId: string; sessionId: string; title: string; canWrite?: boolean }) {
  const [page, setPage] = useState(0);
  const [wordIdx, setWordIdx] = useState<number | null>(null);
  const [pipOpen, setPipOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["session-story", bookId],
    queryFn: async () => {
      const [story, words, prompts] = await Promise.all([
        supabase.from("book_stories").select("pages, status").eq("book_id", bookId).maybeSingle(),
        supabase.from("word_cards").select("*").eq("book_id", bookId).eq("status", "approved").order("sort_order"),
        supabase.from("discussion_prompts").select("id, prompt_text, crowd_type, story_point").eq("book_id", bookId).eq("status", "approved"),
      ]);
      return { story: story.data, words: (words.data ?? []) as WordCardData[], prompts: (prompts.data ?? []) as Prompt[] };
    },
  });

  const quiz = useMemo(
    () => (data ? buildQuiz(data.words, data.prompts.map((p) => p.prompt_text)) : []),
    [data],
  );

  if (isLoading) return <p className="text-muted-foreground">Loading story…</p>;
  if (!data) return null;

  const { story, words, prompts } = data;
  const isLastPage = story ? page === story.pages.length - 1 : false;

  return (
    <section className="space-y-6" aria-label="Read the story together">
      {story ? (
        <>
          <div className="story-reader overflow-hidden rounded-lg border-2 border-primary">
            <div className="flex items-center justify-between gap-3 bg-story-sun px-5 py-3 text-story-ink">
              <span className="flex items-center gap-2 font-heading text-sm font-semibold"><BookOpen aria-hidden /> {title}</span>
              <span className="shrink-0 text-sm font-bold">{page + 1} / {story.pages.length}</span>
            </div>
            <div className="bg-card px-6 py-8 sm:px-10 sm:py-10">
              <StoryText text={story.pages[page] ?? ""} words={words} onWord={setWordIdx} />
              {isLastPage && <p className="mt-5 flex items-center justify-center gap-2 font-heading font-bold text-primary"><Sparkles aria-hidden /> The end</p>}
            </div>
            <div className="flex items-center justify-between gap-3 bg-story-sky p-4 text-story-ink">
              <Button variant="outline" className="min-h-12" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}><ArrowLeft aria-hidden /> Back</Button>
              <div className="flex flex-wrap justify-center gap-1" aria-label="Reading progress">{story.pages.map((_, i) => <span key={i} className={cn("size-2 rounded-full", i === page ? "bg-primary" : "bg-primary/25")} />)}</div>
              <Button className="min-h-12" onClick={() => setPage((p) => (isLastPage ? 0 : p + 1))}>{isLastPage ? "Read again" : "Next"}<ArrowRight aria-hidden /></Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Underlined words are this book's key words — tap one to open its card.</p>
        </>
      ) : (
        <p className="border-l-4 border-accent bg-secondary p-4 text-secondary-foreground">
          This story is still awaiting staff review. Use the key words and prompts below with a physical copy meanwhile.
        </p>
      )}

      {prompts.length > 0 && (
        <section aria-label="Discussion prompts">
          <h3 className="text-xl font-semibold">Talk about the story (CROWD)</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {prompts.map((p) => (
              <li key={p.id} className="rounded-xl border bg-card p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">{CROWD[p.crowd_type] ?? p.crowd_type} · {p.story_point}</p>
                <p className="mt-1">{p.prompt_text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {quiz.length > 0 && <Quiz questions={quiz} sessionId={sessionId} canWrite={canWrite} />}

      <WordCardDialog cards={words} openIdx={wordIdx} onClose={() => setWordIdx(null)} onNavigate={setWordIdx} />

      {prompts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 w-72 max-w-[calc(100vw-2rem)]">
          {pipOpen ? (
            <div className="rounded-2xl border-2 border-primary bg-card shadow-xl">
              <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
                <p className="flex items-center gap-2 text-sm font-bold"><MessageCircleQuestion className="h-4 w-4 text-primary" aria-hidden /> CROWD prompts</p>
                <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="Collapse prompts" onClick={() => setPipOpen(false)}>
                  <Minus className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <ul className="max-h-64 space-y-2 overflow-y-auto p-3">
                {prompts.map((p) => (
                  <li key={p.id} className="rounded-lg bg-muted p-2 text-sm">
                    <span className="font-semibold text-primary">{CROWD[p.crowd_type] ?? p.crowd_type}:</span> {p.prompt_text}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Button className="ml-auto flex min-h-12 gap-2 rounded-full shadow-lg" onClick={() => setPipOpen(true)}>
              <MessageCircleQuestion className="h-5 w-5" aria-hidden /> CROWD prompts
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

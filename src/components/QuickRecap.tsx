import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COMPLETED_SESSION_STATUS } from "@/lib/session-status";
import { cn } from "@/lib/utils";

type RecapCard = { key: string; front: string; back: string; source: "tricky" | "keyword" };

/**
 * Quick Recap flip cards shown before a session: the child's unlearned tricky
 * words plus the key words from the last finished session's book.
 */
export function QuickRecap({ childId }: { childId: string }) {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  const { data: cards } = useQuery({
    queryKey: ["quick-recap", childId],
    queryFn: async (): Promise<RecapCard[]> => {
      const [{ data: tricky }, { data: lastSession }] = await Promise.all([
        supabase.from("tricky_words").select("id, word").eq("child_id", childId).eq("mastered", false).order("created_at", { ascending: false }),
        supabase.from("sessions").select("book_id").eq("child_id", childId).eq("status", COMPLETED_SESSION_STATUS).not("book_id", "is", null).order("scheduled_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const out: RecapCard[] = (tricky ?? []).map((w) => ({
        key: `t-${w.id}`,
        front: w.word,
        back: "A tricky word from earlier sessions. Sign it, say it, use it in a sentence.",
        source: "tricky",
      }));
      if (lastSession?.book_id) {
        const { data: keyWords } = await supabase
          .from("word_cards")
          .select("id, word, definition")
          .eq("book_id", lastSession.book_id)
          .eq("status", "approved")
          .order("sort_order");
        for (const w of keyWords ?? []) {
          out.push({ key: `k-${w.id}`, front: w.word, back: w.definition, source: "keyword" });
        }
      }
      return out;
    },
  });

  if (!cards || cards.length === 0) return null;

  const toggle = (key: string) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <section className="rounded-2xl border-2 border-story-sun bg-card p-5" aria-label="Quick recap">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <Sparkles className="text-primary" aria-hidden /> Quick Recap
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Warm up together: tap a card to flip it. Tricky words this child is still learning, plus key words from last time.
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const isFlipped = flipped.has(c.key);
          return (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => toggle(c.key)}
                aria-pressed={isFlipped}
                aria-label={`${c.front} — tap to ${isFlipped ? "hide" : "see"} the meaning`}
                className={cn(
                  "flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3 text-center transition",
                  isFlipped ? "border-primary bg-secondary" : "border-story-sky bg-story-sky/40 hover:border-primary",
                )}
              >
                {isFlipped ? (
                  <span className="text-sm leading-snug">{c.back}</span>
                ) : (
                  <>
                    <span className="font-heading text-xl font-bold">{c.front}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <RotateCcw className="h-3 w-3" aria-hidden /> {c.source === "tricky" ? "Tricky word" : "Last session"}
                    </span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

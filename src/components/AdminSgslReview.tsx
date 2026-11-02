import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { sgslUrl } from "@/lib/sgsl";
import { rejectSgslCandidates, saveSgslWordCard } from "@/lib/sgsl.functions";

type Pending = { title: string; text: string; label: string; run: () => Promise<unknown>; success: string };

export function AdminSgslReview() {
  const qc = useQueryClient();
  const save = useServerFn(saveSgslWordCard);
  const reject = useServerFn(rejectSgslCandidates);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, error } = useQuery({
    queryKey: ["admin-sgsl-review"],
    queryFn: async () => {
      const { data, error } = await supabase.from("word_cards")
        .select("id, book_id, word, definition, pronunciation, example_sentence, sign_bank_url, sgsl_candidates, books(title)")
        .is("sgsl_url", null).eq("sgsl_manual", false);
      if (error) throw error;
      return (data ?? []).filter((c) => c.sgsl_candidates.length)
        .sort((a, b) => (a.books?.title ?? "").localeCompare(b.books?.title ?? "") || a.word.localeCompare(b.word));
    },
  });

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try {
      await pending.run();
      toast.success(pending.success);
      await qc.invalidateQueries({ queryKey: ["admin-sgsl-review"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); setPending(null); }
  }

  const n = data?.length ?? 0;
  return (
    <section>
      <h2 className="text-xl font-semibold">SgSL signs to review</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {error ? "Signs to review could not load." : n ? `${n} ${n === 1 ? "sign" : "signs"} to review` : "No signs waiting for review."}
      </p>
      <ul className="mt-3 space-y-2">
        {data?.map((c) => {
          const title = c.books?.title ?? "Untitled book";
          return (
            <li key={c.id} className="rounded-2xl border bg-card p-4">
              <p className="text-2xl font-bold">{c.word}</p>
              <Link to="/library/$bookId" params={{ bookId: c.book_id }} className="font-semibold text-primary underline-offset-4 hover:underline">{title}</Link>
              {c.example_sentence && <p className="mt-2 text-sm italic text-muted-foreground">“{c.example_sentence}”</p>}
              <ul className="mt-3 space-y-2">
                {c.sgsl_candidates.map((cand) => (
                  <li key={cand} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <a href={sgslUrl(cand)} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-4 sm:mr-auto">{cand}</a>
                    <Button variant="outline" className="min-h-11" onClick={() => setPending({
                      title: "Use this sign?",
                      text: `Use ${cand} for '${c.word}' in ${title}? Volunteers will see this sign.`,
                      label: "Use this sign",
                      success: `${cand} saved for '${c.word}'.`,
                      run: () => save({ data: {
                        id: c.id, bookId: c.book_id, word: c.word, definition: c.definition ?? "",
                        pronunciation: c.pronunciation ?? "", example_sentence: c.example_sentence ?? "",
                        sign_bank_url: c.sign_bank_url ?? null, sgsl_url: sgslUrl(cand),
                      } }),
                    })}>Use this sign</Button>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" className="mt-3 min-h-11" onClick={() => setPending({
                title: "None of these fit?",
                text: `No SgSL sign will be linked for '${c.word}' in ${title}. Volunteers will keep seeing the ASL fallback, and re-checks won't bring this back.`,
                label: "None of these fit",
                success: `Marked no SgSL sign for '${c.word}'.`,
                run: () => reject({ data: { id: c.id } }),
              })}>None of these fit</Button>
            </li>
          );
        })}
      </ul>
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && !busy && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pending?.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" disabled={busy} onClick={(e) => { e.preventDefault(); void confirm(); }}>{pending?.label}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/guide")({
  head: () => ({ meta: [{ title: "Volunteer Guide · CODA Reading Toolkit" }, { name: "description", content: "Scenario cards and quiz for volunteers." }] }),
  component: Guide,
});

function Guide() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["guide"],
    queryFn: async () => {
      const [c, q] = await Promise.all([
        supabase.from("guide_cards").select("*").order("sort_order"),
        supabase.from("guide_quiz_questions").select("id, question, options, sort_order").order("sort_order").order("id"),
      ]);
      return { cards: c.data ?? [], questions: q.data ?? [] };
    },
  });

  if (!data) return <p className="text-muted-foreground">Loading…</p>;
  const { cards, questions } = data;
  const onQuiz = step >= cards.length;
  const card = cards[step];

  async function submit() {
    setBusy(true);
    const arr = questions.map((_, i) => answers[i] ?? -1);
    const { data: passed, error } = await supabase.rpc("submit_guide_quiz", { _answers: arr });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (passed) {
      toast.success("You passed! Children and sessions are now unlocked.");
      qc.invalidateQueries();
    } else toast.error("Not quite — check your answers against the cards and try again.");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Volunteer Guide</h1>
      {me?.qualified && (
        <p className="flex items-center gap-2 rounded-2xl bg-secondary p-4 text-secondary-foreground">
          <CheckCircle2 className="h-5 w-5" aria-hidden /> You've passed the guide. <Link to="/dashboard" className="font-semibold underline">Go to your children</Link>
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {onQuiz ? "Quiz" : `Card ${step + 1} of ${cards.length}`}
      </p>

      {!onQuiz && card ? (
        <article className="rounded-2xl border bg-card p-6">
          <h2 className="text-2xl font-semibold">{card.title}</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-lg">
            {card.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          {card.avoid_tip && <p className="mt-4 rounded-xl bg-muted p-3"><strong>Avoid:</strong> {card.avoid_tip}</p>}
        </article>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <fieldset key={q.id} className="rounded-2xl border bg-card p-5">
              <legend className="px-1 font-semibold">{i + 1}. {q.question}</legend>
              <div className="mt-2 space-y-2">
                {q.options.map((o, j) => (
                  <label key={j} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 hover:bg-muted">
                    <input type="radio" name={q.id} checked={answers[i] === j} onChange={() => setAnswers({ ...answers, [i]: j })} />
                    {o}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <Button className="min-h-12 w-full" disabled={busy || Object.keys(answers).length < questions.length} onClick={submit}>Submit quiz</Button>
        </div>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="outline" className="min-h-11" disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</Button>
        {!onQuiz && <Button className="min-h-11" onClick={() => setStep(step + 1)}>{step === cards.length - 1 ? "Start the quiz" : "Next"}</Button>}
      </div>
    </div>
  );
}

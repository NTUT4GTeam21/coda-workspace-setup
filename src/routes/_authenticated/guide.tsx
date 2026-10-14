import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, HeartHandshake, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import readingGarden from "@/assets/reading-garden.jpg";

export const Route = createFileRoute("/_authenticated/guide")({
  head: () => ({ meta: [
    { title: "Volunteer Guide · CODA Reading Toolkit" },
    { name: "description", content: "Understand CODA identities, practise reading scenarios and complete your volunteer knowledge check." },
    { property: "og:title", content: "Volunteer Guide · CODA Reading Toolkit" },
    { property: "og:description", content: "CODA backgrounds, practical reading guidance and a twelve-question knowledge check." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Guide,
});

function Guide() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [passed, setPassed] = useState(false);
  const { data, error, refetch } = useQuery({
    queryKey: ["guide"],
    queryFn: async () => {
      const [c, q] = await Promise.all([
        supabase.from("guide_cards").select("*").order("sort_order").order("id"),
        supabase.from("guide_quiz_questions").select("id, question, options, guide_card_id, sort_order").order("sort_order").order("id"),
      ]);
      if (c.error) throw c.error;
      if (q.error) throw q.error;
      return { cards: c.data, questions: q.data };
    },
  });
  if (error) return <section role="alert" className="space-y-4"><h1 className="text-2xl font-bold">Volunteer Guide</h1><p>The guide could not load. Please try again.</p><Button onClick={() => refetch()}>Try again</Button></section>;
  if (!data) return <p role="status" className="text-muted-foreground">Loading your guide…</p>;
  const { cards, questions } = data;
  if (!cards.length || !questions.length) return <p role="alert">The guide is not available yet. Please contact programme staff.</p>;
  const onQuiz = step >= cards.length;
  const card = cards[step];
  const completed = passed || me?.qualified;
  const allRead = cards.every((c) => read.has(c.id));
  const answered = Object.keys(answers).length;
  const category = step < 3 ? "Understand & connect" : step < 8 ? "Read & respond" : "Care & hand over";
  const canSubmit = me?.isVolunteer || me?.isAdmin;

  function advance() {
    if (card) setRead((previous) => new Set([...previous, card.id]));
    setStep(step + 1);
  }
  async function submit() {
    if (busy || !allRead || answered !== questions.length) return;
    setBusy(true);
    try {
      const { data: result, error: submitError } = await supabase.rpc("submit_guide_quiz", { _answers: questions.map((_, i) => answers[i] ?? -1) });
      if (submitError) throw submitError;
      setFailed(!result);
      if (result) {
        setPassed(true);
        await qc.invalidateQueries();
        toast.success("You passed! Children and sessions are now unlocked.");
      }
    } catch {
      toast.error("Your quiz could not be submitted. Your answers are still here; please try again.");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-7">
      <header className="reading-banner relative overflow-hidden border-b border-border">
        <img src={readingGarden} alt="" width={1536} height={768} className="absolute inset-0 h-full w-full object-cover object-right" />
        <div className="relative max-w-sm px-5 py-7 sm:px-7 sm:py-9">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-primary"><HeartHandshake className="size-4" aria-hidden /> A little preparation. A lot of care.</p>
          <h1 className="text-3xl font-bold">Volunteer Guide</h1>
          <p className="mt-3 max-w-64 text-base text-foreground">Every child brings a different story.</p>
        </div>
      </header>
      {completed && <div role="status" className="flex flex-wrap items-center gap-2 border-l-4 border-primary bg-secondary p-4 text-secondary-foreground"><CheckCircle2 className="size-5" aria-hidden /> You’ve passed the guide. <Link to="/dashboard" className="font-bold underline">Go to your children</Link></div>}
      <div className="grid items-start gap-7 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-border pb-4 lg:border-b-0 lg:border-r lg:pr-5">
          <p className="mb-3 font-heading text-sm font-semibold">Your reading journey</p>
          <nav aria-label="Guide topics" className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {cards.map((c, i) => <Button key={c.id} variant="ghost" aria-current={!onQuiz && i === step ? "step" : undefined} onClick={() => { setStep(i); }} className={cn("h-auto min-h-11 justify-start whitespace-normal px-2 py-2 text-left text-xs leading-snug", i === step && "bg-secondary text-secondary-foreground")}><span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground", read.has(c.id) && "bg-primary text-primary-foreground")}>{read.has(c.id) ? <Check className="size-3" aria-label="Read" /> : String(i + 1).padStart(2, "0")}</span>{c.title}</Button>)}
            <Button variant="ghost" disabled={!allRead && !completed} onClick={() => setStep(cards.length)} className={cn("mt-2 min-h-11 justify-start", onQuiz && "bg-secondary text-secondary-foreground")}><ShieldCheck aria-hidden /> Knowledge check</Button>
          </nav>
          <p className="mt-4 text-xs text-muted-foreground">{read.size} of {cards.length} cards read · {questions.length} questions</p>
        </aside>
        <div className="min-w-0 space-y-5">
          {!onQuiz && card ? <>
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground"><span className="font-semibold text-primary">{category}</span><span>{step + 1} / {cards.length}</span></div>
            <article key={card.id} className="guide-card border-t-4 border-primary bg-card p-5 sm:p-7">
              <BookOpen className="mb-4 size-7 text-primary" aria-hidden />
              <h2 className="text-xl font-bold sm:text-2xl">{card.title}</h2>
              <ol className="mt-5 space-y-4">
                {card.steps.map((s, i) => <li key={i} className="flex gap-3 leading-relaxed"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{i + 1}</span><span>{s}</span></li>)}
              </ol>
              {card.avoid_tip && <p className="mt-5 border-l-4 border-accent bg-accent/20 p-3 text-sm leading-relaxed"><strong>Keep in mind:</strong> {card.avoid_tip}</p>}
            </article>
            <div className="flex justify-between gap-2"><Button variant="outline" className="min-h-11" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft aria-hidden /> Previous</Button><Button className="min-h-11" onClick={advance}>{step === cards.length - 1 ? "Finish card" : "Read & next"}<ArrowRight aria-hidden /></Button></div>
            {step === cards.length - 1 && allRead && <Button className="min-h-11 w-full" onClick={() => setStep(cards.length)}>Start the knowledge check <ArrowRight aria-hidden /></Button>}
          </> : <section className="space-y-5">
            <div><p className="mb-2 text-sm font-semibold text-primary">Put your care into practice</p><h2 className="text-2xl font-bold">Knowledge check</h2><p className="mt-2 text-muted-foreground">{answered} of {questions.length} answered · All answers must be correct to pass.</p></div>
            {!allRead && !completed && <p role="alert" className="bg-secondary p-4">Read and finish each guide card before submitting.</p>}
            {failed && <p role="alert" className="border-l-4 border-accent bg-secondary p-4">Not quite yet. Revisit the related cards, check your answers and try again. Your choices are saved while you review.</p>}
            {questions.map((q, i) => <fieldset key={q.id} className="rounded-lg border bg-card p-4 sm:p-5"><legend className="px-1 font-heading text-sm font-semibold">{i + 1}. {q.question}</legend><div className="space-y-2">{q.options.map((o, j) => <label key={j} className={cn("flex min-h-12 cursor-pointer items-start gap-3 rounded-md border border-transparent p-3 text-sm leading-relaxed hover:bg-muted", answers[i] === j && "border-primary bg-secondary")}><input type="radio" name={q.id} checked={answers[i] === j} onChange={() => setAnswers({ ...answers, [i]: j })} className="mt-1 shrink-0 accent-primary" />{o}</label>)}</div>{q.guide_card_id && <Button variant="link" className="mt-1 h-auto whitespace-normal px-0 text-xs" onClick={() => { const index = cards.findIndex((c) => c.id === q.guide_card_id); if (index >= 0) setStep(index); }}>Review related card <ArrowRight aria-hidden /></Button>}</fieldset>)}
            {canSubmit ? <Button className="min-h-12 w-full" disabled={busy || !allRead || answered !== questions.length} onClick={submit}>{busy ? "Checking your answers…" : "Submit knowledge check"}<ShieldCheck aria-hidden /></Button> : <p className="text-muted-foreground">Volunteer access is needed to submit this knowledge check.</p>}
          </section>}
          <footer className="border-t pt-4 text-xs leading-relaxed text-muted-foreground"><p>Learning references: <a href="https://sadeaf.org.sg/about-deafness/deaf-culture-and-sign-language-programme/" target="_blank" rel="noreferrer" className="text-primary underline">SADeaf: Deaf culture and sign language</a> · <a href="https://www.channelnewsasia.com/cna-insider/children-deaf-adults-growing-up-coda-singapore-2738836" target="_blank" rel="noreferrer" className="text-primary underline">CODA experiences in Singapore</a></p><p className="mt-2">Volunteer learning draft for programme review. Confirm SADeaf’s safeguarding contact and reporting procedure before your first session.</p></footer>
        </div>
      </div>
    </div>
  );
}

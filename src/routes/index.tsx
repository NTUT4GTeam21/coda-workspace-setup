import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, HandHeart, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CODA Reading Toolkit · SADeaf volunteers" },
      { name: "description", content: "A ready-to-use toolkit for SADeaf volunteers running 1-to-1 reading sessions with children of Deaf adults." },
      { property: "og:title", content: "CODA Reading Toolkit" },
      { property: "og:description", content: "Pick a book, run a session, and hand over to the next volunteer — with almost no prep." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const steps = [
  { icon: BookOpen, title: "Pick a book", text: "Levelled stories with key words and discussion prompts ready to go." },
  { icon: HandHeart, title: "Run the session", text: "Calm, step-by-step guidance you can follow on your phone." },
  { icon: NotebookPen, title: "Hand over", text: "Leave a short note so the next volunteer starts fully informed." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-5 py-16 sm:py-24">
        <p className="font-heading text-sm font-semibold uppercase tracking-widest text-primary">For SADeaf volunteers</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
          Reading sessions with CODAs,<br className="hidden sm:block" /> ready when you are.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Everything you need to prepare and run a 1-to-1 reading session with a child of Deaf adults — in one place.
        </p>
        <div className="mt-8">
          <Button asChild size="lg" className="min-h-12 px-6 text-base">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
        <ol className="mt-16 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border bg-card p-5">
              <s.icon className="h-6 w-6 text-primary" aria-hidden />
              <h2 className="mt-3 text-lg font-semibold">{i + 1}. {s.title}</h2>
              <p className="mt-1 text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}

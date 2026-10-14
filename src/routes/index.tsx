import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, HandHeart, NotebookPen } from "lucide-react";
import readingGarden from "@/assets/reading-garden.jpg";
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
      <section className="reading-banner public-reading-banner relative overflow-hidden border-b">
        <img src={readingGarden} alt="" width={1536} height={768} className="absolute inset-0 h-full w-full object-cover object-right" />
        <div className="relative mx-auto max-w-5xl px-5 py-12 sm:py-20">
        <p className="font-heading text-sm font-semibold uppercase tracking-widest text-primary">For SADeaf volunteers</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
          CODA<br />Reading Toolkit
        </h1>
        <p className="mt-5 max-w-sm text-lg text-muted-foreground">
          Everything you need to prepare and run a 1-to-1 reading session with a child of Deaf adults — in one place.
        </p>
        <div className="mt-8">
          <Button asChild size="lg" className="min-h-12 px-6 text-base">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
        </div>
      </section>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-lg border-t-4 border-primary bg-card p-5 even:border-story-coral last:border-story-sun">
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

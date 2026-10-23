import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { LevelBadge } from "@/components/LevelBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/library/")({
  head: () => ({ meta: [{ title: "Book library · Read between the Signs" }, { name: "description", content: "Find a book by level, theme and length." }, { property: "og:title", content: "Book library · Read between the Signs" }, { property: "og:description", content: "Find a book by level, theme and length." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Library,
});

const lengths = [
  { id: "any", label: "Any length" },
  { id: "short", label: "Short (≤10 min)" },
  { id: "medium", label: "Medium (11–15)" },
  { id: "long", label: "Long (16+)" },
];

function Library() {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<number | null>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [length, setLength] = useState("any");

  const { data: books, isLoading, error } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, level, tags, summary, reading_time, status")
        .order("level")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const themes = useMemo(() => Array.from(new Set(books?.flatMap((b) => b.tags) ?? [])).sort(), [books]);
  const filtered = (books ?? []).filter((b) => {
    if (level && b.level !== level) return false;
    if (theme && !b.tags.includes(theme)) return false;
    if (q && !b.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (length === "short" && b.reading_time > 10) return false;
    if (length === "medium" && (b.reading_time <= 10 || b.reading_time > 15)) return false;
    if (length === "long" && b.reading_time <= 15) return false;
    return true;
  });

  const chip = (active: boolean) =>
    cn("min-h-10 rounded-full border px-4 text-sm font-semibold", active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Book library</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input aria-label="Search by title" placeholder="Search by title" value={q} onChange={(e) => setQ(e.target.value)} className="min-h-12 pl-9" />
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Level">
          <button className={chip(level === null)} onClick={() => setLevel(null)}>All levels</button>
          {[1, 2, 3].map((l) => (
            <button key={l} className={chip(level === l)} onClick={() => setLevel(l)}>Level {l}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Length">
          {lengths.map((l) => (
            <button key={l.id} className={chip(length === l.id)} onClick={() => setLength(l.id)}>{l.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Theme">
          <button className={chip(theme === null)} onClick={() => setTheme(null)}>All themes</button>
          {themes.map((t) => (
            <button key={t} className={chip(theme === t)} onClick={() => setTheme(t)}>{t}</button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading books…</p>}
      {error && <p className="text-destructive">Could not load books.</p>}
      {books && books.length === 0 && (
        <p className="rounded-2xl border bg-secondary p-4 text-secondary-foreground">
          The library unlocks once you're qualified. Finish the Volunteer Guide and quiz first (see Guide in the menu).
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => (
          <li key={b.id}>
            <Link
              to="/library/$bookId"
              params={{ bookId: b.id }}
              className="flex h-full flex-col rounded-2xl border bg-card p-5 transition hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
            >
              <LevelBadge level={b.level} className="self-start" />
              <h2 className="mt-3 text-lg font-semibold leading-snug">{b.title}</h2>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{b.summary}</p>
              <p className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" aria-hidden /> {b.reading_time} min
                {b.status === "draft" && <span className="ml-auto rounded bg-accent px-2 text-xs font-bold text-accent-foreground">Draft</span>}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {books && books.length > 0 && filtered.length === 0 && <p className="text-muted-foreground">No books match these filters.</p>}
    </div>
  );
}

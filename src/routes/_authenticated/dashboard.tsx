import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, LEVEL_LABELS } from "@/lib/auth";
import readingGarden from "@/assets/reading-garden.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home · CODA Reading Toolkit" }, { name: "description", content: "Your children and sessions." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me, isLoading } = useMe();
  const canSee = !!me && ((me.qualified && me.isVolunteer) || me.isAdmin);
  const { data: children } = useQuery({
    queryKey: ["my-children"],
    enabled: canSee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("children")
        .select("id, nickname, age_band, current_level")
        .eq("archived", false)
        .order("nickname");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !me) return <p className="text-muted-foreground">Loading…</p>;
  const roleLabel = me.isAdmin ? "Programme staff" : me.isViewer ? "Viewer" : me.requestedRole === "staff" ? "Waiting for staff approval" : "Volunteer";

  return (
    <div className="space-y-8">
      <div className="reading-banner relative overflow-hidden border-b">
        <img src={readingGarden} alt="" width={1536} height={768} className="absolute inset-0 h-full w-full object-cover" />
        <div className="relative max-w-sm px-5 py-8 sm:px-7">
        <p className="mb-2 text-sm font-semibold text-primary">A new chapter starts here</p>
        <h1 className="text-3xl font-bold">Hello{me.fullName ? `, ${me.fullName}` : ""}</h1>
        <p className="mt-2 text-muted-foreground">{roleLabel}</p>
        </div>
      </div>

      {me.isViewer && !me.isAdmin ? (
        <section className="rounded-2xl border bg-secondary p-5 text-secondary-foreground">
          <p>As a viewer you can browse the book library.</p>
          <Button asChild className="mt-3 min-h-11"><Link to="/library">Open the library</Link></Button>
        </section>
      ) : !me.isAdmin && me.requestedRole === "staff" && !me.isVolunteer ? (
        <section className="rounded-2xl border bg-secondary p-5 text-secondary-foreground">
          Your programme staff request is waiting for approval by existing SADeaf staff.
        </section>
      ) : !canSee ? (
        <section className="rounded-2xl border-2 border-accent bg-secondary p-5" aria-live="polite">
          <div className="flex items-start gap-3">
            <Lock className="mt-1 h-5 w-5 text-secondary-foreground" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-secondary-foreground">Finish the guide to unlock sessions</h2>
              <p className="mt-1 text-secondary-foreground/80">
                Children's records, the book library and sessions open once you read the Volunteer Guide and pass its short quiz.
              </p>
              <Button asChild className="mt-3 min-h-11"><Link to="/guide">Start the Volunteer Guide</Link></Button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section>
            <h2 className="text-xl font-semibold">{me.isAdmin ? "All children" : "My children"}</h2>
            {children && children.length === 0 && (
              <p className="mt-2 text-muted-foreground">{me.isAdmin ? "No children yet. Add them on the Admin page." : "No children assigned to you yet."}</p>
            )}
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {children?.map((c) => (
                <li key={c.id}>
                  <Link to="/children/$childId" params={{ childId: c.id }} className="flex items-center rounded-2xl border bg-card p-4 hover:border-primary">
                    <div className="flex-1">
                      <p className="font-heading text-lg font-semibold">{c.nickname}</p>
                      <p className="text-sm text-muted-foreground">Age {c.age_band} · {LEVEL_LABELS[c.current_level]}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <Button asChild variant="outline" className="min-h-11">
            <Link to="/library">Browse the book library</Link>
          </Button>
        </>
      )}
    </div>
  );
}

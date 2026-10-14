import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, LEVEL_LABELS } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home · CODA Reading Toolkit" }, { name: "description", content: "Your children and sessions." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me, isLoading } = useMe();
  const canSee = !!me && (me.qualified || me.isAdmin);
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Hello{me.fullName ? `, ${me.fullName}` : ""}</h1>
        <p className="mt-1 text-muted-foreground">{me.isAdmin ? "Programme staff" : "Volunteer"}</p>
      </div>

      {!canSee ? (
        <section className="rounded-2xl border-2 border-accent bg-secondary p-5" aria-live="polite">
          <div className="flex items-start gap-3">
            <Lock className="mt-1 h-5 w-5 text-secondary-foreground" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-secondary-foreground">Finish the guide to unlock sessions</h2>
              <p className="mt-1 text-secondary-foreground/80">
                Children's records, the book library and sessions open once you complete the Volunteer Guide and pass the quiz.
                The guide is coming soon — for now, programme staff can mark you as qualified.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section>
            <h2 className="text-xl font-semibold">{me.isAdmin ? "All children" : "My children"}</h2>
            {children && children.length === 0 && (
              <p className="mt-2 text-muted-foreground">No children assigned to you yet.</p>
            )}
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {children?.map((c) => (
                <li key={c.id} className="rounded-2xl border bg-card p-4">
                  <p className="font-heading text-lg font-semibold">{c.nickname}</p>
                  <p className="text-sm text-muted-foreground">Age {c.age_band} · {LEVEL_LABELS[c.current_level]}</p>
                </li>
              ))}
            </ul>
          </section>
          <Button asChild className="min-h-11">
            <Link to="/library">Browse the book library</Link>
          </Button>
        </>
      )}
    </div>
  );
}

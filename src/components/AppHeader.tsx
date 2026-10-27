import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Home, LogOut, Shield, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RaiseConcern } from "@/components/RaiseConcern";

const linkCls =
  "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground";
const activeCls = "bg-secondary text-secondary-foreground";

export function AppHeader() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const tabs = [
    { to: "/dashboard", label: "Home", icon: Home },
    { to: "/library", label: "Library", icon: BookOpen },
    ...(!me?.isViewer || me?.isAdmin || me?.isVolunteer ? [{ to: "/guide", label: "Guide", icon: GraduationCap }] : []),
    ...(me?.isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ] as const;

  return (
    <>
    <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
      <div className="story-stripe" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-2">
        <Link
          to="/dashboard"
          className="mr-auto flex min-w-0 items-center gap-2 font-heading text-lg font-bold text-primary"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="size-5" aria-hidden />
          </span>
          <span className="max-w-60 truncate leading-snug sm:whitespace-normal">Read between the Signs</span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
          {tabs.map((t) => (
            <Link key={t.to} to={t.to} className={`${linkCls} hidden sm:inline-flex`} activeProps={{ className: activeCls }}>
              <t.icon className="h-4 w-4" aria-hidden /> {t.label}
            </Link>
          ))}
          {me && (me.isVolunteer || me.isAdmin) && <RaiseConcern variant="header" />}
          {me && <Popover>
            <PopoverTrigger asChild><Button variant="outline" className="min-h-11 max-w-44" aria-label="Your profile"><UserRound aria-hidden /><span className="hidden truncate sm:inline">{me.fullName || "My profile"}</span></Button></PopoverTrigger>
            <PopoverContent align="end" className="space-y-2">
              <p className="font-heading font-semibold">{me.fullName || "Your profile"}</p>
              <p className="break-words text-sm text-muted-foreground">{me.email}</p>
              <p className="text-sm font-semibold">{me.isAdmin ? "Programme staff" : me.isViewer ? "Viewer" : me.isVolunteer ? "Volunteer" : "Staff approval pending"}</p>
              {me.isVolunteer && <p className="text-sm">{me.qualified ? `Qualified${me.qualifiedUntil ? ` until ${me.qualifiedUntil.toLocaleDateString()}` : ""} · Ready for sessions` : "Not qualified · Pass the guide to run sessions"}</p>}
              {me.isVolunteer && !me.qualified && <Button asChild variant="secondary"><Link to="/guide">Continue the guide</Link></Button>}
              <Button variant="ghost" className="min-h-11 w-full justify-start" onClick={signOut}>
                <LogOut className="h-4 w-4" aria-hidden /> Sign out
              </Button>
            </PopoverContent>
          </Popover>}
          <Button variant="ghost" className="hidden min-h-11 sm:inline-flex" onClick={signOut}>
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </Button>
        </nav>
      </div>
    </header>
      <nav
        aria-label="Main tabs"
        className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-card pb-[env(safe-area-inset-bottom)] sm:hidden"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground"
            activeProps={{ className: "text-primary bg-secondary" }}
          >
            <t.icon className="size-5" aria-hidden />
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

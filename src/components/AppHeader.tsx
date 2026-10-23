import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Home, LogOut, Shield, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

  return (
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
          className="mr-auto flex items-center gap-2 font-heading text-lg font-bold text-primary"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="size-5" aria-hidden />
          </span>
          <span className="max-w-60 leading-snug">Read between the Signs</span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
          <Link to="/dashboard" className={linkCls} activeProps={{ className: activeCls }}>
            <Home className="h-4 w-4" aria-hidden /> Home
          </Link>
          <Link to="/library" className={linkCls} activeProps={{ className: activeCls }}>
            <BookOpen className="h-4 w-4" aria-hidden /> Library
          </Link>
          {(!me?.isViewer || me?.isAdmin || me?.isVolunteer) && (
            <Link to="/guide" className={linkCls} activeProps={{ className: activeCls }}>
              <GraduationCap className="h-4 w-4" aria-hidden /> Guide
            </Link>
          )}
          {me?.isAdmin && (
            <Link to="/admin" className={linkCls} activeProps={{ className: activeCls }}>
              <Shield className="h-4 w-4" aria-hidden /> Admin
            </Link>
          )}
          {me && <Popover>
            <PopoverTrigger asChild><Button variant="outline" className="min-h-11 max-w-44" aria-label="Your profile"><UserRound aria-hidden /><span className="truncate">{me.fullName || "My profile"}</span></Button></PopoverTrigger>
            <PopoverContent align="end" className="space-y-2">
              <p className="font-heading font-semibold">{me.fullName || "Your profile"}</p>
              <p className="break-words text-sm text-muted-foreground">{me.email}</p>
              <p className="text-sm font-semibold">{me.isAdmin ? "Programme staff" : me.isViewer ? "Viewer" : me.isVolunteer ? "Volunteer" : "Staff approval pending"}</p>
              {me.isVolunteer && <p className="text-sm">{me.qualified ? "Qualified · Ready for sessions" : "Guide not passed yet"}</p>}
              {me.isVolunteer && !me.qualified && <Button asChild variant="secondary"><Link to="/guide">Continue the guide</Link></Button>}
            </PopoverContent>
          </Popover>}
          <Button variant="ghost" className="min-h-11" onClick={signOut}>
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </Button>
        </nav>
      </div>
    </header>
  );
}

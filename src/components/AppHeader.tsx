import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Home, LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";

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
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-2">
        <Link to="/dashboard" className="mr-auto font-heading text-lg font-bold text-primary">
          CODA Reading Toolkit
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
          <Link to="/dashboard" className={linkCls} activeProps={{ className: activeCls }}>
            <Home className="h-4 w-4" aria-hidden /> Home
          </Link>
          <Link to="/library" className={linkCls} activeProps={{ className: activeCls }}>
            <BookOpen className="h-4 w-4" aria-hidden /> Library
          </Link>
          {me && !me.isViewer && (
            <Link to="/guide" className={linkCls} activeProps={{ className: activeCls }}>
              <GraduationCap className="h-4 w-4" aria-hidden /> Guide
            </Link>
          )}
          {me?.isAdmin && (
            <Link to="/admin" className={linkCls} activeProps={{ className: activeCls }}>
              <Shield className="h-4 w-4" aria-hidden /> Admin
            </Link>
          )}
          <Button variant="ghost" className="min-h-11" onClick={signOut}>
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </Button>
        </nav>
      </div>
    </header>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password · Read between the Signs" },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: "Reset password · Read between the Signs" },
      { property: "og:description", content: "Choose a new password for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The recovery link arrives with type=recovery in the URL hash.
    if (window.location.hash.includes("type=recovery")) {
      setReady(true);
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("Password updated.");
    setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1200);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <Link to="/" className="font-heading text-sm font-semibold text-primary">
          Read between the Signs
        </Link>
        {done ? (
          <div className="mt-4">
            <h1 className="text-2xl font-bold">Password updated</h1>
            <p className="mt-2 text-muted-foreground">Taking you to your home page…</p>
          </div>
        ) : ready ? (
          <>
            <h1 className="mt-4 text-2xl font-bold">Choose a new password</h1>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-11"
                />
              </div>
              <Button type="submit" disabled={busy} className="min-h-11 w-full text-base">
                {busy ? "Please wait…" : "Save new password"}
              </Button>
            </form>
          </>
        ) : (
          <div className="mt-4">
            <h1 className="text-2xl font-bold">Reset your password</h1>
            <p className="mt-2 text-muted-foreground">
              This page needs the reset link from your email. Ask for a new link from the sign-in
              page if yours has expired.
            </p>
            <Button asChild className="mt-4 min-h-11">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

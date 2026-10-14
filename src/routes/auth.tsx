import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_INFO } from "@/lib/auth";
import readingGarden from "@/assets/reading-garden.jpg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · CODA Reading Toolkit" },
      { name: "description", content: "Sign in to the CODA Reading Toolkit." },
      { property: "og:title", content: "Sign in · CODA Reading Toolkit" },
      { property: "og:description", content: "Volunteer, programme staff and viewer sign-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Role = (typeof ROLE_INFO)[number]["id"];

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role>("volunteer");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { full_name: fullName, requested_role: role, volunteer_code: role === "volunteer" ? code.trim().toUpperCase() : "" },
          },
        });
        if (error) {
          if (/database error/i.test(error.message)) throw new Error("That volunteer code isn't valid or has already been used. Ask SADeaf for your code.");
          throw error;
        }
        setCheckEmail(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await supabase.rpc("touch_last_login");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-lg border bg-card shadow-sm">
        <img src={readingGarden} alt="An open book growing a colourful story garden" width={1536} height={768} className="h-44 w-full object-cover" />
        <div className="p-6">
        <Link to="/" className="font-heading text-sm font-semibold text-primary">CODA Reading Toolkit</Link>
        {checkEmail ? (
          <div className="mt-4">
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="mt-2 text-muted-foreground">We sent a confirmation link to {email}. Open it to finish signing up.</p>
            {role === "staff" && <p className="mt-2 text-muted-foreground">Existing programme staff will then approve your staff access.</p>}
          </div>
        ) : (
          <>
            <h1 className="mt-4 text-2xl font-bold">{mode === "signin" ? "Sign in" : "Create an account"}</h1>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <>
                  <fieldset className="space-y-2">
                    <legend className="mb-1 text-sm font-semibold">I am a…</legend>
                    {ROLE_INFO.map((r) => (
                      <label key={r.id} className={cn("block cursor-pointer rounded-xl border-2 p-3", role === r.id ? "border-primary bg-secondary" : "border-border")}>
                        <input type="radio" name="role" value={r.id} checked={role === r.id} onChange={() => setRole(r.id)} className="mr-2" />
                        <span className="font-semibold">{r.label}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">{r.text}</span>
                      </label>
                    ))}
                  </fieldset>
                  {role === "volunteer" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="code">Volunteer code from SADeaf</Label>
                      <Input id="code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. VOL-ABC123" className="min-h-11 uppercase" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="min-h-11" />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="min-h-11" />
              </div>
              <Button type="submit" disabled={busy} className="min-h-11 w-full text-base">
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
              </Button>
            </form>
            <Button variant="link"
              type="button"
              className="mt-4 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
            </Button>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

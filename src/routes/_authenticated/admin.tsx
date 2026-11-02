import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, ROLE_INFO } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminSessionTransfers } from "@/components/AdminSessionTransfers";
import { AdminSgslRecheck } from "@/components/AdminSgslRecheck";
import { AdminSgslReview } from "@/components/AdminSgslReview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · Read between the Signs" }, { name: "description", content: "Manage volunteers, codes and children." }, { property: "og:title", content: "Admin · Read between the Signs" }, { property: "og:description", content: "Manage volunteers, codes and children." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Admin,
});

function newCode(prefix: string) {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return prefix + "-" + Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

function Confirm({
  trigger,
  title,
  text,
  actionLabel = "Yes, continue",
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  text: string;
  actionLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{text}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{actionLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Admin() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [codeLabel, setCodeLabel] = useState("");
  const [codeRole, setCodeRole] = useState<"volunteer" | "admin">("volunteer");
  const [child, setChild] = useState({ nickname: "", age_band: "6-8", current_level: 1 });

  const { data } = useQuery({
    queryKey: ["admin-data"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }, { data: codes }, { data: children }, { data: assigns }, { data: drafts }, { data: concerns }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, qualified, last_login_at, requested_role, volunteer_code, deactivated").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("volunteer_codes").select("*").order("created_at", { ascending: false }),
        supabase.from("children").select("id, nickname, archived").order("nickname"),
        supabase.from("child_assignments").select("child_id, volunteer_id"),
        supabase.from("book_stories").select("book_id, updated_at, books(title)").eq("status", "draft"),
        supabase.from("safeguarding_reports").select("id, details, created_at, children(nickname), profiles(full_name)").order("created_at", { ascending: false }),
      ]);
      const has = (id: string, r: string) => (roles ?? []).some((x) => x.user_id === id && x.role === r);
      const people = (profiles ?? []).map((p) => ({ ...p, isAdmin: has(p.id, "admin"), isViewer: has(p.id, "viewer"), isVolunteer: has(p.id, "volunteer") }));
      return { people, codes: codes ?? [], children: children ?? [], assigns: assigns ?? [], drafts: drafts ?? [], concerns: concerns ?? [] };
    },
  });

  if (!me?.isAdmin) return <p>This page is for programme staff only.</p>;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-data"] }); qc.invalidateQueries({ queryKey: ["me"] }); };
  const call = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) toast.error(error.message); else refresh(); };

  const volunteers = data?.people.filter((p) => !p.isViewer || p.isAdmin) ?? [];
  const activeChildren = data?.children.filter((c) => !c.archived) ?? [];

  async function addCode(e: FormEvent) {
    e.preventDefault();
    await call(supabase.from("volunteer_codes").insert({ code: newCode(codeRole === "admin" ? "STF" : "VOL"), label: codeLabel, role: codeRole }));
    setCodeLabel("");
  }
  async function addChild(e: FormEvent) {
    e.preventDefault();
    await call(supabase.from("children").insert(child));
    setChild({ ...child, nickname: "" });
  }
  async function toggleAssign(childId: string, volId: string, on: boolean) {
    await call(on
      ? supabase.from("child_assignments").insert({ child_id: childId, volunteer_id: volId })
      : supabase.from("child_assignments").delete().eq("child_id", childId).eq("volunteer_id", volId));
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold">Admin</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {ROLE_INFO.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-card p-4">
              <p className="font-semibold">{r.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      <AdminSessionTransfers />

      <AdminSgslRecheck />

      <section>
        <h2 className="text-xl font-semibold">Content to review</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {data?.drafts.length
            ? `${data.drafts.length} ${data.drafts.length === 1 ? "story" : "stories"} waiting for review`
            : "No stories waiting for review."}
        </p>
        <ul className="mt-3 space-y-2">
          {data?.drafts.map((d) => (
            <li key={d.book_id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
              <Link to="/library/$bookId" params={{ bookId: d.book_id }} className="mr-auto font-semibold text-primary underline-offset-4 hover:underline">
                {d.books?.title ?? "Untitled book"}
              </Link>
              <Confirm
                trigger={<Button className="min-h-11">Approve for readers</Button>}
                title="Approve this story for readers?"
                text="Only approve after you have read the whole story on the book page. Volunteers and children will then see it."
                actionLabel="I've read it — approve"
                onConfirm={() => call(supabase.rpc("approve_book_story", { _book_id: d.book_id }))}
              />
            </li>
          ))}
        </ul>
      </section>

      <AdminSgslReview />

      <section>
        <h2 className="text-xl font-semibold">Concerns</h2>
        <p className="mt-1 text-sm text-muted-foreground">Private safeguarding concerns raised by volunteers. Never share these back with other volunteers.</p>
        {data?.concerns.length === 0 && <p className="mt-3 text-muted-foreground">No concerns raised.</p>}
        <ul className="mt-3 space-y-2">
          {data?.concerns.map((c) => (
            <li key={c.id} className="rounded-2xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                {new Date(c.created_at).toLocaleString()} · {c.profiles?.full_name ?? "A volunteer"}
                {c.children?.nickname ? ` · about ${c.children.nickname}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-line">{c.details}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Sign-up codes</h2>
        <p className="text-sm text-muted-foreground">Create one code per person and send it to them. Each code works once. Staff codes create programme staff accounts; volunteer codes create volunteer accounts.</p>
        <form onSubmit={addCode} className="mt-3 flex flex-wrap gap-2">
          <select aria-label="Code type" value={codeRole} onChange={(e) => setCodeRole(e.target.value as "volunteer" | "admin")} className="min-h-11 rounded-md border bg-background px-3">
            <option value="volunteer">Volunteer code</option>
            <option value="admin">Staff code</option>
          </select>
          <Input aria-label="Who is this code for?" placeholder="Who is it for? (e.g. first name)" value={codeLabel} onChange={(e) => setCodeLabel(e.target.value)} className="min-h-11 flex-1" />
          <Button type="submit" className="min-h-11">Create code</Button>
        </form>
        <ul className="mt-3 space-y-2">
          {data?.codes.map((c) => (
            <li key={c.code} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
              <code className="font-mono font-bold">{c.code}</code>
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold">{c.role === "admin" ? "Staff" : "Volunteer"}</span>
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <span className="ml-auto text-sm">{c.used_by ? `Used ${new Date(c.used_at!).toLocaleDateString()}` : "Not used yet"}</span>
              {!c.used_by && (
                <Confirm
                  trigger={<Button variant="ghost" className="min-h-11 text-destructive">Cancel code</Button>}
                  title={`Cancel code ${c.code}?`}
                  text="The code will stop working. This cannot be undone, but you can always create a new code."
                  actionLabel="Cancel this code"
                  onConfirm={() => call(supabase.from("volunteer_codes").delete().eq("code", c.code))}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">People</h2>
        <ul className="mt-3 space-y-3">
          {volunteers.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4">
              <div className="mr-auto">
                <p className="font-semibold">{r.full_name || "Unnamed"} <span className="text-sm font-normal text-muted-foreground">· {r.isAdmin ? "Programme staff" : r.isViewer ? "Viewer" : "Volunteer"}{r.volunteer_code ? ` · ${r.volunteer_code}` : ""}{r.deactivated ? " · deactivated" : ""}</span></p>
                <p className="text-sm text-muted-foreground">Last sign-in: {r.last_login_at ? new Date(r.last_login_at).toLocaleDateString() : "never"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Confirm
                  trigger={<Switch id={`q-${r.id}`} checked={r.qualified} />}
                  title={r.qualified ? `Mark ${r.full_name || "this person"} as not qualified?` : `Mark ${r.full_name || "this person"} as qualified?`}
                  text={r.qualified ? "They will lose access to children and sessions until qualified again." : "They will gain access to their assigned children and sessions."}
                  onConfirm={() => call(supabase.rpc("set_volunteer_qualified", { _user_id: r.id, _qualified: !r.qualified }))}
                />
                <Label htmlFor={`q-${r.id}`}>Qualified</Label>
              </div>
              <div className="flex items-center gap-2">
                <Confirm
                  trigger={<Switch id={`a-${r.id}`} checked={r.isAdmin} disabled={r.id === me.id} />}
                  title={r.isAdmin ? `Remove staff access for ${r.full_name || "this person"}?` : `Make ${r.full_name || "this person"} programme staff?`}
                  text={r.isAdmin ? "They will no longer manage volunteers, codes or content." : "They will be able to manage volunteers, codes, children and content."}
                  onConfirm={() => call(supabase.rpc("set_admin_role", { _user_id: r.id, _is_admin: !r.isAdmin }))}
                />
                <Label htmlFor={`a-${r.id}`}>Staff</Label>
              </div>
              {r.id !== me.id && (
                <Confirm
                  trigger={<Button variant="outline" className="min-h-11">{r.deactivated ? "Reactivate" : "Deactivate"}</Button>}
                  title={r.deactivated ? `Reactivate ${r.full_name || "this volunteer"}?` : `Deactivate ${r.full_name || "this volunteer"}?`}
                  text={r.deactivated ? "They will regain access to their assigned children and the library." : "They will immediately lose access to children's records, sessions and the library. Their past notes stay for the team."}
                  actionLabel={r.deactivated ? "Reactivate" : "Deactivate"}
                  onConfirm={() => call(supabase.rpc("set_volunteer_active", { _user_id: r.id, _active: r.deactivated }))}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Children and assignments</h2>
        <p className="text-sm text-muted-foreground">Use a code or first name only (e.g. Child A). No surnames or family details.</p>
        <form onSubmit={addChild} className="mt-3 flex flex-wrap items-end gap-2">
          <Input aria-label="Nickname" required placeholder="Nickname" value={child.nickname} onChange={(e) => setChild({ ...child, nickname: e.target.value })} className="min-h-11 flex-1" />
          <Input aria-label="Age band" placeholder="Age band" value={child.age_band} onChange={(e) => setChild({ ...child, age_band: e.target.value })} className="min-h-11 w-28" />
          <select aria-label="Level" value={child.current_level} onChange={(e) => setChild({ ...child, current_level: Number(e.target.value) })} className="min-h-11 rounded-md border bg-background px-3">
            <option value={1}>Level 1</option><option value={2}>Level 2</option><option value={3}>Level 3</option>
          </select>
          <Button type="submit" className="min-h-11">Add child</Button>
        </form>
        <ul className="mt-4 space-y-3">
          {activeChildren.map((c) => (
            <li key={c.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="mr-auto font-semibold">{c.nickname}</p>
                <Confirm
                  trigger={<Button variant="ghost" className="min-h-11 text-destructive">Archive</Button>}
                  title={`Archive ${c.nickname}?`}
                  text="Archiving hides this child from volunteers and new sessions. Past session notes are kept. Only do this when they have left the programme."
                  actionLabel="Archive child"
                  onConfirm={() => call(supabase.from("children").update({ archived: true }).eq("id", c.id))}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-4">
                {data!.people.filter((p) => p.isVolunteer && !p.deactivated).map((p) => {
                  const on = data!.assigns.some((a) => a.child_id === c.id && a.volunteer_id === p.id);
                  return (
                    <label key={p.id} className="flex min-h-11 items-center gap-2 text-sm">
                      <input type="checkbox" checked={on} onChange={(e) => toggleAssign(c.id, p.id, e.target.checked)} />
                      {p.full_name || "Unnamed"}
                    </label>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

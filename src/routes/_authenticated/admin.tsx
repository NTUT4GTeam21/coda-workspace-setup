import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, ROLE_INFO } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · Read between the Signs" }, { name: "description", content: "Manage volunteers, codes and children." }, { property: "og:title", content: "Admin · Read between the Signs" }, { property: "og:description", content: "Manage volunteers, codes and children." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Admin,
});

function newCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "VOL-" + Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

function Admin() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [codeLabel, setCodeLabel] = useState("");
  const [child, setChild] = useState({ nickname: "", age_band: "6-8", current_level: 1 });

  const { data } = useQuery({
    queryKey: ["admin-data"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }, { data: codes }, { data: children }, { data: assigns }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, qualified, last_login_at, requested_role, volunteer_code").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("volunteer_codes").select("*").order("created_at", { ascending: false }),
        supabase.from("children").select("id, nickname").eq("archived", false).order("nickname"),
        supabase.from("child_assignments").select("child_id, volunteer_id"),
      ]);
      const has = (id: string, r: string) => (roles ?? []).some((x) => x.user_id === id && x.role === r);
      const people = (profiles ?? []).map((p) => ({ ...p, isAdmin: has(p.id, "admin"), isViewer: has(p.id, "viewer"), isVolunteer: has(p.id, "volunteer") }));
      return { people, codes: codes ?? [], children: children ?? [], assigns: assigns ?? [] };
    },
  });

  if (!me?.isAdmin) return <p>This page is for programme staff only.</p>;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-data"] }); qc.invalidateQueries({ queryKey: ["me"] }); };
  const call = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) toast.error(error.message); else refresh(); };

  const pending = data?.people.filter((p) => p.requested_role === "staff" && !p.isAdmin && !p.isVolunteer) ?? [];
  const volunteers = data?.people.filter((p) => !p.isViewer || p.isAdmin) ?? [];

  async function addCode(e: FormEvent) {
    e.preventDefault();
    await call(supabase.from("volunteer_codes").insert({ code: newCode(), label: codeLabel }));
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

      {pending.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">Staff requests</h2>
          <ul className="mt-3 space-y-2">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-accent bg-card p-4">
                <span className="mr-auto font-semibold">{p.full_name || "Unnamed"}</span>
                <Button className="min-h-11" onClick={() => call(supabase.rpc("approve_staff", { _user_id: p.id, _approve: true }))}>Approve as staff</Button>
                <Button variant="outline" className="min-h-11" onClick={() => call(supabase.rpc("approve_staff", { _user_id: p.id, _approve: false }))}>Make volunteer instead</Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold">Volunteer codes</h2>
        <p className="text-sm text-muted-foreground">Create one code per volunteer and send it to them. Each code works once.</p>
        <form onSubmit={addCode} className="mt-3 flex gap-2">
          <Input aria-label="Who is this code for?" placeholder="Who is it for? (e.g. Volunteer first name)" value={codeLabel} onChange={(e) => setCodeLabel(e.target.value)} className="min-h-11" />
          <Button type="submit" className="min-h-11">Create code</Button>
        </form>
        <ul className="mt-3 space-y-2">
          {data?.codes.map((c) => (
            <li key={c.code} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
              <code className="font-mono font-bold">{c.code}</code>
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <span className="ml-auto text-sm">{c.used_by ? `Used ${new Date(c.used_at!).toLocaleDateString()}` : "Not used yet"}</span>
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
                <p className="font-semibold">{r.full_name || "Unnamed"} <span className="text-sm font-normal text-muted-foreground">· {r.isAdmin ? "Programme staff" : r.isViewer ? "Viewer" : "Volunteer"}{r.volunteer_code ? ` · ${r.volunteer_code}` : ""}</span></p>
                <p className="text-sm text-muted-foreground">Last sign-in: {r.last_login_at ? new Date(r.last_login_at).toLocaleDateString() : "never"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch id={`q-${r.id}`} checked={r.qualified} onCheckedChange={(v) => call(supabase.rpc("set_volunteer_qualified", { _user_id: r.id, _qualified: v }))} />
                <Label htmlFor={`q-${r.id}`}>Qualified</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id={`a-${r.id}`} checked={r.isAdmin} disabled={r.id === me.id} onCheckedChange={(v) => call(supabase.rpc("set_admin_role", { _user_id: r.id, _is_admin: v }))} />
                <Label htmlFor={`a-${r.id}`}>Staff</Label>
              </div>
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
          {data?.children.map((c) => (
            <li key={c.id} className="rounded-2xl border bg-card p-4">
              <p className="font-semibold">{c.nickname}</p>
              <div className="mt-2 flex flex-wrap gap-4">
                {data.people.filter((p) => p.isVolunteer).map((p) => {
                  const on = data.assigns.some((a) => a.child_id === c.id && a.volunteer_id === p.id);
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

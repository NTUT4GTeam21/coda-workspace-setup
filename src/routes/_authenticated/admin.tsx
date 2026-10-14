import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · CODA Reading Toolkit" }, { name: "description", content: "Manage volunteers." }] }),
  component: Admin,
});

function Admin() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: rows } = useQuery({
    queryKey: ["admin-volunteers"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, qualified, last_login_at").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        isAdmin: (roles ?? []).some((r) => r.user_id === p.id && r.role === "admin"),
      }));
    },
  });

  if (!me?.isAdmin) return <p>This page is for programme staff only.</p>;

  async function setQualified(id: string, v: boolean) {
    const { error } = await supabase.rpc("set_volunteer_qualified", { _user_id: id, _qualified: v });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-volunteers"] });
    qc.invalidateQueries({ queryKey: ["me"] });
  }
  async function setAdmin(id: string, v: boolean) {
    const { error } = await supabase.rpc("set_admin_role", { _user_id: id, _is_admin: v });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-volunteers"] });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Volunteers</h1>
      <p className="text-muted-foreground">Mark volunteers as qualified to unlock children, books and sessions. Guide progress will appear here once the guide is built.</p>
      <ul className="space-y-3">
        {rows?.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4">
            <div className="mr-auto">
              <p className="font-semibold">{r.full_name || "Unnamed volunteer"}</p>
              <p className="text-sm text-muted-foreground">
                Last sign-in: {r.last_login_at ? new Date(r.last_login_at).toLocaleDateString() : "never"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch id={`q-${r.id}`} checked={r.qualified} onCheckedChange={(v) => setQualified(r.id, v)} />
              <Label htmlFor={`q-${r.id}`}>Qualified</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id={`a-${r.id}`} checked={r.isAdmin} disabled={r.id === me.id} onCheckedChange={(v) => setAdmin(r.id, v)} />
              <Label htmlFor={`a-${r.id}`}>Admin</Label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

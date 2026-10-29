import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isQualificationActive } from "@/lib/qualification";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

export function AdminSessionTransfers() {
  const qc = useQueryClient();
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, isPending, error } = useQuery({
    queryKey: ["admin-session-transfers"],
    refetchInterval: 15000,
    queryFn: async () => {
      const [sessions, profiles, roles, assignments, handovers] = await Promise.all([
        supabase.from("sessions").select("id, child_id, volunteer_id, scheduled_at, children(nickname), books(title)").eq("status", "in_progress").order("scheduled_at"),
        supabase.from("profiles").select("id, full_name, qualified, quiz_passed_at, last_login_at, deactivated"),
        supabase.from("user_roles").select("user_id, role").eq("role", "volunteer"),
        supabase.from("child_assignments").select("child_id, volunteer_id"),
        supabase.from("handover_feedback").select("session_id"),
      ]);
      for (const result of [sessions, profiles, roles, assignments, handovers]) if (result.error) throw result.error;
      return { sessions: sessions.data ?? [], profiles: profiles.data ?? [], roles: roles.data ?? [], assignments: assignments.data ?? [], handovers: handovers.data ?? [] };
    },
  });
  const selected = data?.sessions.find((s) => s.id === confirmId);
  const name = (id: string | undefined) => data?.profiles.find((p) => p.id === id)?.full_name || "Unnamed volunteer";
  async function transfer() {
    if (!selected || busy) return;
    const volunteerId = choices[selected.id];
    if (!volunteerId) return;
    setBusy(true);
    const { error } = await supabase.rpc("transfer_ongoing_session", { _session_id: selected.id, _volunteer_id: volunteerId, _expected_volunteer_id: selected.volunteer_id });
    setBusy(false);
    if (error) { toast.error(error.message); qc.invalidateQueries({ queryKey: ["admin-session-transfers"] }); return; }
    setConfirmId(null);
    setChoices((previous) => ({ ...previous, [selected.id]: "" }));
    await qc.invalidateQueries();
    toast.success("Session transferred. The new volunteer can now continue it.");
  }
  return (
    <section aria-labelledby="session-transfers-title">
      <h2 id="session-transfers-title" className="text-xl font-semibold">Ongoing sessions</h2>
      {isPending && <p className="mt-3 text-muted-foreground">Loading sessions…</p>}
      {error && <p role="alert" className="mt-3 text-destructive">Sessions could not be loaded. <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["admin-session-transfers"] })}>Try again</Button></p>}
      {data?.sessions.length === 0 && <p className="mt-3 text-muted-foreground">No ongoing sessions.</p>}
      <ul className="mt-3 space-y-3">
        {data?.sessions.map((s) => {
          const eligible = data.profiles.filter((p) => p.id !== s.volunteer_id && !p.deactivated && isQualificationActive(p.qualified, p.quiz_passed_at, p.last_login_at) && data.roles.some((r) => r.user_id === p.id) && data.assignments.some((a) => a.child_id === s.child_id && a.volunteer_id === p.id));
          const hasNotes = data.handovers.some((h) => h.session_id === s.id);
          return (
            <li key={s.id} className="rounded-lg border bg-card p-4">
              <Link to="/sessions/$sessionId" params={{ sessionId: s.id }} className="font-semibold text-primary underline-offset-4 hover:underline">{s.children?.nickname ?? "Child"} · {s.books?.title ?? "No book chosen"}</Link>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(s.scheduled_at).toLocaleString()} · {name(s.volunteer_id)}</p>
              {hasNotes ? <p className="mt-3 text-sm text-muted-foreground">Handover notes have already been saved; this session cannot be transferred.</p> : eligible.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No other active, qualified volunteer is assigned to this child.</p> : (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label htmlFor={`transfer-${s.id}`}>Transfer to volunteer</Label>
                    <select id={`transfer-${s.id}`} className="min-h-11 w-full rounded-md border bg-background px-3" value={choices[s.id] ?? ""} onChange={(e) => setChoices((c) => ({ ...c, [s.id]: e.target.value }))} disabled={busy}>
                      <option value="">Choose volunteer…</option>
                      {eligible.map((p) => <option key={p.id} value={p.id}>{p.full_name || "Unnamed volunteer"}</option>)}
                    </select>
                  </div>
                  <Button variant="outline" disabled={busy || !eligible.some((p) => p.id === choices[s.id])} onClick={() => setConfirmId(s.id)} className="min-h-11"><ArrowRightLeft aria-hidden className="h-4 w-4" /> Transfer session</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <AlertDialog open={Boolean(selected)} onOpenChange={(open) => { if (!open && !busy) setConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer this ongoing session?</AlertDialogTitle>
            <AlertDialogDescription>Transfer {selected?.children?.nickname ?? "this child"}'s session from {selected ? name(selected.volunteer_id) : ""} to {selected ? name(choices[selected.id]) : ""}? The previous volunteer will no longer be able to continue it. Saved quiz answers and tricky words stay with the session. Unsaved notes on their device are not transferred.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button disabled={busy} onClick={transfer}>{busy ? "Transferring…" : "Confirm transfer"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
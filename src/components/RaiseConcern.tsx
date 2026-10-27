import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Private safeguarding concern form. Reports go only to programme staff —
 * never to session history or other volunteers.
 */
export function RaiseConcern({ variant }: { variant: "header" | "floating" }) {
  const [open, setOpen] = useState(false);
  const [childId, setChildId] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const { data: children } = useQuery({
    queryKey: ["concern-children"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("children")
        .select("id, nickname")
        .eq("archived", false)
        .order("nickname");
      return data ?? [];
    },
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!details.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("safeguarding_reports").insert({
      child_id: childId || null,
      details: `Date of concern: ${date}\n\n${details.trim()}`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  function close(o: boolean) {
    setOpen(o);
    if (!o) {
      setSent(false);
      setDetails("");
      setChildId("");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        {variant === "header" ? (
          <Button variant="outline" className="hidden min-h-11 sm:inline-flex">
            <HeartHandshake className="h-4 w-4" aria-hidden /> Raise a concern
          </Button>
        ) : (
          <Button
            className="fixed bottom-24 right-4 z-30 min-h-14 rounded-full px-5 shadow-lg sm:hidden"
            aria-label="Raise a concern"
          >
            <HeartHandshake className="h-5 w-5" aria-hidden /> Concern
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle>Raise a concern</DialogTitle>
        <DialogDescription>
          Private and only seen by SADeaf programme staff. If a child is in immediate danger, call
          the police at 999 first.
        </DialogDescription>
        {sent ? (
          <div className="space-y-3 rounded-2xl bg-secondary p-5 text-secondary-foreground">
            <p className="font-semibold">Thank you — your concern has been shared privately.</p>
            <p className="text-sm">
              Programme staff will follow up. You can also contact SADeaf's safeguarding officer
              directly: <em>[safeguarding contact to be confirmed by SADeaf]</em>.
            </p>
            <Button className="min-h-11" onClick={() => close(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="concern-child">Which child? (optional)</Label>
              <select
                id="concern-child"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="min-h-11 w-full rounded-md border bg-background px-3"
              >
                <option value="">Prefer not to say / not about a specific child</option>
                {(children ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nickname}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="concern-date">When did this happen?</Label>
              <Input
                id="concern-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="concern-details">What happened, in the child's own words</Label>
              <Textarea
                id="concern-details"
                required
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Write down what the child said or did, as closely as you remember."
                rows={5}
              />
            </div>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Sending…" : "Share privately with programme staff"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

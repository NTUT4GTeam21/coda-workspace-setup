import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { beginSgslRun, checkSgslBatch } from "@/lib/sgsl.functions";

type Counts = { found: number; possible: number; missing: number; failed: number };

/** Staff-only batch re-check; each batch saves as it goes, so a closed page loses nothing. */
export function AdminSgslRecheck() {
  const begin = useServerFn(beginSgslRun);
  const batch = useServerFn(checkSgslBatch);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<Counts | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setSummary(null);
    try {
      const { words, list } = await begin();
      const totals: Counts = { found: 0, possible: 0, missing: 0, failed: 0 };
      setProgress({ done: 0, total: words.length });
      for (let i = 0; i < words.length; i += 3) {
        const chunk = words.slice(i, i + 3);
        const c = await batch({ data: { words: chunk, list } });
        (Object.keys(totals) as (keyof Counts)[]).forEach((k) => (totals[k] += c[k]));
        setProgress({ done: Math.min(i + chunk.length, words.length), total: words.length });
      }
      setSummary(totals);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The SgSL check stopped. Run it again to continue.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="text-xl font-semibold">SgSL sign links</h2>
      <p className="mt-1 text-sm text-muted-foreground">Checks every word card against the SgSL Signbank. Staff-set links are never changed. It takes about 3 seconds per word.</p>
      <Button className="mt-3 min-h-11" onClick={run} disabled={running}>{running ? "Checking…" : "Re-check SgSL signs"}</Button>
      {progress && (
        <div className="mt-3 space-y-1" aria-live="polite">
          <Progress value={progress.total ? (progress.done / progress.total) * 100 : 100} />
          <p className="text-sm">Checked {progress.done} of {progress.total} words</p>
        </div>
      )}
      {summary && (
        <p className="mt-2 font-semibold" aria-live="polite">
          {summary.found} found · {summary.possible} possible matches to review · {summary.missing} not in SgSL · {summary.failed} failed
        </p>
      )}
    </section>
  );
}

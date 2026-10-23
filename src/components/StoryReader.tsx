import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Expand, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import baoReading from "@/assets/bao-reading.jpg";

export function StoryReader({ bookId, title, externalUrl }: { bookId: string; title: string; externalUrl?: string | null }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftPages, setDraftPages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { data: story, isLoading, error } = useQuery({
    queryKey: ["story", bookId],
    queryFn: async () => {
      const { data, error } = await supabase.from("book_stories").select("*").eq("book_id", bookId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function save(approve: boolean) {
    if (!story || !me?.isAdmin || saving) return;
    const pages = editing ? draftPages.map((p) => p.trim()) : story.pages;
    if (pages.some((p) => !p)) { toast.error("Each page needs story text."); return; }
    setSaving(true);
    const { error } = await supabase.from("book_stories").update({ pages, status: approve ? "approved" : "draft", updated_at: new Date().toISOString() }).eq("book_id", bookId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setEditing(false);
    await qc.invalidateQueries({ queryKey: ["story", bookId] });
    toast.success(approve ? "Story approved for readers." : "Story saved as a draft.");
  }

  const content = story && (
    <div className="story-reader overflow-hidden rounded-lg border-2 border-primary">
      <div className="flex items-center justify-between gap-3 bg-story-sun px-5 py-3 text-story-ink">
        <span className="flex items-center gap-2 font-heading text-sm font-semibold"><BookOpen aria-hidden /> {title}</span>
        <span className="shrink-0 text-sm font-bold">{page + 1} / {story.pages.length}</span>
      </div>
      {title === "Bao and the Big Rain" && <img src={baoReading} alt="Bao the cat shelters under a table as rain falls outside." width={1280} height={768} loading="lazy" className="max-h-64 w-full object-cover" />}
      <div className="bg-card px-6 py-8 sm:px-10 sm:py-10">
        <p className="min-h-36 whitespace-pre-line font-heading text-xl leading-relaxed sm:text-2xl">{story.pages[page]}</p>
        {page === story.pages.length - 1 && <p className="mt-5 flex items-center justify-center gap-2 font-heading font-bold text-primary"><Sparkles aria-hidden /> The end</p>}
      </div>
      <div className="flex items-center justify-between gap-3 bg-story-sky p-4 text-story-ink">
        <Button variant="outline" className="min-h-12" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}><ArrowLeft aria-hidden /> Back</Button>
        <div className="flex flex-wrap justify-center gap-1" aria-label="Reading progress">{story.pages.map((_, i) => <span key={i} className={`size-2 rounded-full ${i === page ? "bg-primary" : "bg-primary/25"}`} />)}</div>
        <Button className="min-h-12" onClick={() => setPage((p) => p === story.pages.length - 1 ? 0 : p + 1)}>{page === story.pages.length - 1 ? "Read again" : "Next"}<ArrowRight aria-hidden /></Button>
      </div>
    </div>
  );

  return (
    <section className="space-y-4" aria-label="Read the story">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold"><BookOpen className="text-primary" aria-hidden /> Read the story</h2>
        {story && <Button variant="secondary" className="min-h-11" onClick={() => setOpen(true)}><Expand aria-hidden /> Reading view</Button>}
      </div>
      {isLoading && <p role="status">Loading story…</p>}
      {error && <p role="alert" className="text-destructive">The story could not load. Please refresh and try again.</p>}
      {!isLoading && !error && !story && <p className="border-l-4 border-accent bg-secondary p-4 text-secondary-foreground">The original story is awaiting programme staff review. It will appear here after approval.{externalUrl ? " You can use the linked book below meanwhile." : " Choose another approved story or ask staff for a physical copy."}</p>}
      {story?.status === "draft" && <p className="border-l-4 border-accent bg-accent/20 p-4 text-sm"><strong>Staff preview · AI-written draft.</strong> Check reading level, factual accuracy, Deaf representation, safeguarding and that every word card and discussion prompt matches this story before approving it.</p>}
      {content}
      {externalUrl && <Button asChild variant="outline" className="min-h-11"><a href={externalUrl} target="_blank" rel="noreferrer">Open linked book <ArrowRight aria-hidden /></a></Button>}
      {story && me?.isAdmin && <div className="space-y-3 border-t pt-4">
        {editing && draftPages.map((text, i) => <div key={i} className="space-y-1"><label htmlFor={`story-${bookId}-${i}`} className="text-sm font-semibold">Page {i + 1}</label><Textarea id={`story-${bookId}-${i}`} value={text} onChange={(e) => setDraftPages((pages) => pages.map((p, j) => j === i ? e.target.value : p))} /></div>)}
        <div className="flex flex-wrap gap-2">
          {!editing ? <Button variant="outline" className="min-h-11" onClick={() => { setDraftPages(story.pages); setEditing(true); }}><Pencil aria-hidden /> Edit story</Button> : <><Button disabled={saving} variant="outline" className="min-h-11" onClick={() => save(false)}>Save as draft</Button><Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></>}
          {story.status === "draft" && <Button disabled={saving} className="min-h-11" onClick={() => save(true)}><CheckCircle2 aria-hidden /> Approve for readers</Button>}
          {story.status === "approved" && !editing && <Button disabled={saving} variant="outline" className="min-h-11" onClick={() => save(false)}>Return to draft</Button>}
        </div>
      </div>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[95dvh] w-[95vw] max-w-4xl overflow-y-auto p-4 sm:p-6">
          <DialogTitle className="pr-6">{title}</DialogTitle>
          <DialogDescription>{story?.status === "draft" ? "Staff preview — not yet approved for children." : "An original story · Read between the Signs"}</DialogDescription>
          {content}
        </DialogContent>
      </Dialog>
    </section>
  );
}
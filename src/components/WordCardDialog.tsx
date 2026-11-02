import { ExternalLink, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type WordCardData = {
  id: string;
  word: string;
  definition: string;
  pronunciation: string;
  example_sentence: string;
  sign_bank_url: string | null;
  sgsl_url?: string | null;
};

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-SG";
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

/** The shared word-card pop-up used by the library page and the session story. */
export function WordCardDialog({
  cards,
  openIdx,
  onClose,
  onNavigate,
}: {
  cards: WordCardData[];
  openIdx: number | null;
  onClose: () => void;
  onNavigate: (idx: number) => void;
}) {
  const card = openIdx !== null ? cards[openIdx] : null;
  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl">
        {card && (
          <div className="space-y-5 text-center">
            <DialogTitle className="font-heading text-5xl font-bold text-primary">{card.word}</DialogTitle>
            <p className="text-lg text-muted-foreground">/{card.pronunciation}/</p>
            <Button variant="secondary" className="min-h-12" onClick={() => speak(card.word)}>
              <Volume2 className="h-5 w-5" aria-hidden /> Hear it
            </Button>
            <DialogDescription className="text-xl text-foreground">{card.definition}</DialogDescription>
            <p className="rounded-2xl bg-muted p-4 text-lg italic">"{card.example_sentence}"</p>
            {card.sgsl_url ? (
              <Button asChild className="min-h-12 w-full sm:w-auto">
                <a href={card.sgsl_url} target="_blank" rel="noreferrer">
                  See the SgSL sign <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              </Button>
            ) : card.sign_bank_url ? (
              <a href={card.sign_bank_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                No SgSL sign found – see the ASL sign (American, may differ) <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No sign link yet.</p>
            )}
            <div className="flex justify-between gap-2">
              <Button variant="outline" className="min-h-12 flex-1" disabled={openIdx === 0} onClick={() => onNavigate((openIdx ?? 1) - 1)}>Previous</Button>
              <Button className="min-h-12 flex-1" disabled={openIdx === cards.length - 1} onClick={() => onNavigate((openIdx ?? 0) + 1)}>Next</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

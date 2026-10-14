import { cn } from "@/lib/utils";
import { LEVEL_LABELS } from "@/lib/auth";

const tone: Record<number, string> = {
  1: "bg-level-1",
  2: "bg-level-2",
  3: "bg-level-3",
};

export function LevelBadge({ level, className }: { level: number; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold text-foreground", tone[level], className)}>
      Level {level} · {LEVEL_LABELS[level]}
    </span>
  );
}

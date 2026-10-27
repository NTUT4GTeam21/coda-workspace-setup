import { cn } from "@/lib/utils";
import baoReading from "@/assets/bao-reading.jpg";

// Cover art is keyed by book id, so renaming a book never loses its picture.
const coverFiles = import.meta.glob("@/assets/covers/*.jpg", { eager: true, import: "default" }) as Record<string, string>;
const COVERS: Record<string, string> = { "00000000-0000-0000-0000-0000000000b3": baoReading };
for (const [path, url] of Object.entries(coverFiles)) {
  const key = path.split("/").pop()!.replace(".jpg", "");
  COVERS["00000000-0000-0000-0000-" + key.padStart(12, "0")] = url;
}

const PALETTES = [
  { bg: "bg-story-sun", ink: "text-story-ink", deco: "bg-story-coral" },
  { bg: "bg-story-sky", ink: "text-story-ink", deco: "bg-story-sun" },
  { bg: "bg-story-coral", ink: "text-story-ink", deco: "bg-story-sky" },
  { bg: "bg-primary", ink: "text-primary-foreground", deco: "bg-story-sun" },
  { bg: "bg-accent", ink: "text-accent-foreground", deco: "bg-story-sky" },
  { bg: "bg-secondary", ink: "text-secondary-foreground", deco: "bg-story-coral" },
] as const;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** A colourful illustrated cover for a book card, chosen deterministically from the book id. */
export function BookCover({ bookId, title, className }: { bookId: string; title: string; className?: string }) {
  const cover = COVERS[bookId];
  if (cover) {
    return (
      <img
        src={cover}
        alt={`Cover illustration for ${title}`}
        width={1280}
        height={768}
        loading="lazy"
        className={cn("h-32 w-full rounded-xl object-cover", className)}
      />
    );
  }
  const h = hashId(bookId);
  const palette = PALETTES[h % PALETTES.length]!;
  const initial = (title.trim()[0] ?? "?").toUpperCase();
  return (
    <div
      aria-hidden
      className={cn(
        "relative flex h-32 w-full items-center justify-center overflow-hidden rounded-xl",
        palette.bg,
        className,
      )}
    >
      <span className={cn("absolute -left-4 -top-6 size-20 rounded-full opacity-70", palette.deco)} />
      <span className={cn("absolute -bottom-8 -right-4 size-24 rounded-full opacity-60", palette.deco)} />
      <span className={cn("absolute right-8 top-3 size-6 rotate-12 rounded-md opacity-70", palette.deco)} />
      <span className={cn("font-heading text-6xl font-bold drop-shadow-sm", palette.ink)}>{initial}</span>
    </div>
  );
}

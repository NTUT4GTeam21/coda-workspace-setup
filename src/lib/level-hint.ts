export const FIT_LABELS: Record<string, string> = {
  too_easy: "Too easy",
  about_right: "About right",
  too_hard: "Too hard",
};

/** Hint shown next to the level picker, based on recent handover level-fit marks (newest first). */
export function levelFitHint(fits: string[]): string {
  const recent = fits.filter((f) => f && f !== "about_right").slice(0, 2);
  const first = recent[0];
  if (!first) return "";
  const label = FIT_LABELS[first] ?? first;
  return recent.length > 1 && recent[1] === first
    ? `Last 2 sessions marked ${label}`
    : `Last session marked ${label}`;
}

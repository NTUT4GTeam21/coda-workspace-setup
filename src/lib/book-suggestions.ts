export type SuggestionBook = { id: string; title: string; level: number; summary: string };

/**
 * Pick the level to suggest from recent handover level-fit marks:
 * one up if the last two said Too easy, one down if the last one said Too hard.
 * `recentFits` must be newest first.
 */
export function suggestedLevel(currentLevel: number, recentFits: string[]): number {
  if (recentFits[0] === "too_easy" && recentFits[1] === "too_easy") {
    return Math.min(3, currentLevel + 1);
  }
  if (recentFits[0] === "too_hard") {
    return Math.max(1, currentLevel - 1);
  }
  return currentLevel;
}

/** Short reason shown under each suggested book. */
export function suggestionReason(currentLevel: number, recentFits: string[]): string {
  if (recentFits[0] === "too_easy" && recentFits[1] === "too_easy") {
    return "A step up — the last two sessions felt too easy.";
  }
  if (recentFits[0] === "too_hard") {
    return "A gentler book — the last session felt too hard.";
  }
  return `New at Level ${currentLevel} — this child hasn't read it yet.`;
}

/** Up to `limit` books at the target level that the child has not read yet. */
export function pickSuggestions(
  books: SuggestionBook[],
  readBookIds: Set<string>,
  targetLevel: number,
  limit = 3,
): SuggestionBook[] {
  return books.filter((b) => b.level === targetLevel && !readBookIds.has(b.id)).slice(0, limit);
}

/** Human-readable labels for handover values stored in the database. */
export function levelFitLabel(value: string): string {
  if (value === "too_easy") return "Too easy";
  if (value === "about_right") return "About right";
  if (value === "too_hard") return "Too hard";
  return value;
}

export function finishedBookLabel(value: string): string {
  if (value === "yes") return "Yes";
  if (value === "partly") return "Partly";
  if (value === "no") return "No";
  return value;
}

/** Turn raw database save errors into calm, useful messages for volunteers. */
export function friendlySaveError(message: string): string {
  if (message.includes("handover_feedback_level_fit_check")) {
    return "The level-fit choice wasn't accepted. Please pick Too easy, About right or Too hard and try again.";
  }
  if (message.includes("handover_feedback_finished_book_check")) {
    return "The finished-book choice wasn't accepted. Please pick Yes, Partly or No and try again.";
  }
  if (message.includes("tricky_words_child_word_unique") || message.includes("duplicate key")) {
    return "That word is already on this child's list.";
  }
  return "Something went wrong saving. Please try again.";
}

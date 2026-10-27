import { expect, it } from "vitest";
import { finishedBookLabel, friendlySaveError, levelFitLabel } from "@/lib/labels";

it("shows level fit as readable labels", () => {
  expect(levelFitLabel("too_easy")).toBe("Too easy");
  expect(levelFitLabel("about_right")).toBe("About right");
  expect(levelFitLabel("too_hard")).toBe("Too hard");
});

it("shows finished book as Yes / Partly / No", () => {
  expect(finishedBookLabel("yes")).toBe("Yes");
  expect(finishedBookLabel("partly")).toBe("Partly");
  expect(finishedBookLabel("no")).toBe("No");
});

it("turns the level-fit constraint error into a friendly message", () => {
  const msg = friendlySaveError('new row violates check constraint "handover_feedback_level_fit_check"');
  expect(msg).toContain("Too easy");
  expect(msg).not.toContain("check constraint");
});

it("turns the finished-book constraint error into a friendly message", () => {
  const msg = friendlySaveError('new row violates check constraint "handover_feedback_finished_book_check"');
  expect(msg).toContain("Yes, Partly or No");
  expect(msg).not.toContain("check constraint");
});

it("turns duplicate tricky words into a friendly message", () => {
  expect(friendlySaveError('duplicate key value violates unique constraint "tricky_words_child_word_unique"')).toBe(
    "That word is already on this child's list.",
  );
});

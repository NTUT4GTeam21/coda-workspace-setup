import { expect, it } from "vitest";
import { pickSuggestions, suggestedLevel } from "@/lib/book-suggestions";

it("suggests one level up when the last two handovers said Too easy", () => {
  expect(suggestedLevel(1, ["too_easy", "too_easy"])).toBe(2);
});

it("never suggests above level 3", () => {
  expect(suggestedLevel(3, ["too_easy", "too_easy"])).toBe(3);
});

it("suggests one level down when the last handover said Too hard", () => {
  expect(suggestedLevel(2, ["too_hard"])).toBe(1);
});

it("never suggests below level 1", () => {
  expect(suggestedLevel(1, ["too_hard"])).toBe(1);
});

it("stays at the child's level otherwise", () => {
  expect(suggestedLevel(2, ["about_right", "too_easy"])).toBe(2);
  expect(suggestedLevel(2, [])).toBe(2);
});

it("only suggests unread books at the target level, up to 3", () => {
  const books = [
    { id: "a", title: "A", level: 2, summary: "" },
    { id: "b", title: "B", level: 2, summary: "" },
    { id: "c", title: "C", level: 2, summary: "" },
    { id: "d", title: "D", level: 2, summary: "" },
    { id: "e", title: "E", level: 1, summary: "" },
  ];
  const picked = pickSuggestions(books, new Set(["a"]), 2);
  expect(picked.map((b) => b.id)).toEqual(["b", "c", "d"]);
});

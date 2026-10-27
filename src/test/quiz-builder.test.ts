import { expect, it } from "vitest";
import { buildQuiz } from "@/lib/quiz-builder";

const cards = [
  { word: "rain", definition: "water falling from the sky", example_sentence: "The rain is loud." },
  { word: "hide", definition: "to go where no one can see you", example_sentence: "Bao will hide under the table." },
  { word: "cosy", definition: "warm and comfortable", example_sentence: "The cosy blanket is soft." },
];

it("builds a definition question whose options include the correct answer", () => {
  const quiz = buildQuiz(cards, []);
  const def = quiz.find((q) => q.kind === "definition");
  expect(def).toBeDefined();
  expect(def!.options).toContain(def!.correctAnswer);
  expect(def!.options.length).toBeGreaterThan(1);
});

it("builds a complete-the-sentence question with the word blanked out", () => {
  const quiz = buildQuiz(cards, []);
  const sentence = quiz.find((q) => q.kind === "sentence");
  expect(sentence).toBeDefined();
  expect(sentence!.question).toContain("____");
  expect(sentence!.options).toContain(sentence!.correctAnswer);
});

it("adds one open discussion question with no score", () => {
  const quiz = buildQuiz(cards, ["What would you do if you were Bao?"]);
  const discussion = quiz.find((q) => q.kind === "discussion");
  expect(discussion).toBeDefined();
  expect(discussion!.options).toEqual([]);
  expect(discussion!.correctAnswer).toContain("no single right answer");
});

it("never builds more than 3 questions", () => {
  expect(buildQuiz(cards, ["Prompt one", "Prompt two"]).length).toBeLessThanOrEqual(3);
});

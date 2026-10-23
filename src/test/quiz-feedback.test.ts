import { describe, expect, it } from "vitest";
import { parseQuizFeedback } from "@/lib/quiz-feedback";

describe("Quiz feedback", () => {
  it("identifies the submitted questions that were incorrect", () => {
    const feedback = parseQuizFeedback({ passed: false, total: 12, incorrect_question_ids: ["question-2", "question-9"] });
    expect(feedback.passed).toBe(false);
    expect(feedback.incorrect_question_ids).toEqual(["question-2", "question-9"]);
  });
  it("recognizes a passed knowledge check", () => {
    expect(parseQuizFeedback({ passed: true, total: 12, incorrect_question_ids: [] }).passed).toBe(true);
  });
  it("rejects the old boolean result instead of treating failure as success", () => {
    expect(() => parseQuizFeedback(false)).toThrow();
  });
});
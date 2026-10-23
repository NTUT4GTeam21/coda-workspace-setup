export type QuizFeedback = {
  passed: boolean;
  total: number;
  incorrect_question_ids: string[];
};

export function parseQuizFeedback(value: unknown): QuizFeedback {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Quiz result is unavailable");
  }
  const result = value as Record<string, unknown>;
  if (typeof result["passed"] !== "boolean" || typeof result["total"] !== "number" ||
      !Array.isArray(result["incorrect_question_ids"]) ||
      !result["incorrect_question_ids"].every((id) => typeof id === "string")) {
    throw new Error("Quiz result is unavailable");
  }
  return { passed: result["passed"], total: result["total"], incorrect_question_ids: result["incorrect_question_ids"] };
}
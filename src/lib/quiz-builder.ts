export type QuizQuestion = {
  kind: "definition" | "sentence" | "discussion";
  question: string;
  /** Multiple-choice options (empty for open discussion questions). */
  options: string[];
  correctAnswer: string;
  /** Short explanation shown after answering. */
  explanation: string;
  word: string | null;
};

type WordCardInput = {
  word: string;
  definition: string;
  example_sentence: string;
};

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Build a 2–3 question end-of-story quiz from the book's word cards and one
 * discussion prompt. Answer positions are randomised; there is no score.
 */
export function buildQuiz(wordCards: WordCardInput[], discussionPrompts: string[]): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const cards = shuffle(wordCards);

  if (cards.length > 0) {
    const target = cards[0]!;
    const distractors = cards.slice(1).map((c) => c.definition);
    questions.push({
      kind: "definition",
      question: `What does “${target.word}” mean?`,
      options: shuffle([target.definition, ...distractors].slice(0, 3)),
      correctAnswer: target.definition,
      explanation: `“${target.word}” means: ${target.definition}`,
      word: target.word,
    });
  }

  const sentenceCard = cards.find((c) => c.example_sentence.toLowerCase().includes(c.word.toLowerCase()));
  if (sentenceCard) {
    const blanked = sentenceCard.example_sentence.replace(
      new RegExp(sentenceCard.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      "____",
    );
    const otherWords = cards.filter((c) => c.word !== sentenceCard.word).map((c) => c.word);
    questions.push({
      kind: "sentence",
      question: `Complete the sentence: “${blanked}”`,
      options: shuffle([sentenceCard.word, ...otherWords].slice(0, 3)),
      correctAnswer: sentenceCard.word,
      explanation: `The missing word is “${sentenceCard.word}”.`,
      word: sentenceCard.word,
    });
  }

  if (discussionPrompts.length > 0) {
    questions.push({
      kind: "discussion",
      question: shuffle(discussionPrompts)[0]!,
      options: [],
      correctAnswer: "Talk it over together — there's no single right answer.",
      explanation: "This is a chatting question. Any thoughtful answer counts.",
      word: null,
    });
  }

  return questions.slice(0, 3);
}

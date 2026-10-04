import type { QuestionPart } from "@prisma/client";
import type { MarkingPoint } from "./marking";

export interface PartFeedback {
  markingPoints: MarkingPoint[];
  examinerComment: string;
  modelAnswer: string | null;
}

/** The mark scheme and examiner's report content for a part, shown after answering. */
export function partFeedback(part: QuestionPart): PartFeedback {
  let modelAnswer: string | null = null;
  if (part.answerType === "MULTIPLE_CHOICE") {
    const options = (part.options ?? []) as { key: string; text: string }[];
    const correct = options.find((o) => o.key === part.correctAnswer);
    modelAnswer = correct ? `${correct.key} – ${correct.text}` : part.correctAnswer;
  } else if (part.answerType === "NUMERIC") {
    modelAnswer = part.correctAnswer;
  } else if (part.answerType === "SHORT_TEXT") {
    modelAnswer = part.acceptedAnswers[0] ?? null;
  }
  return {
    markingPoints: part.markingPoints as unknown as MarkingPoint[],
    examinerComment: part.examinerComment,
    modelAnswer,
  };
}

/** What the browser needs to render a part before it is answered (no answers). */
export function publicPart(part: QuestionPart) {
  return {
    id: part.id,
    label: part.label,
    prompt: part.prompt,
    marks: part.marks,
    answerType: part.answerType,
    options: (part.options ?? null) as { key: string; text: string }[] | null,
  };
}

export type PublicPart = ReturnType<typeof publicPart>;

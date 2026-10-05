import type { QuestionPart } from "@prisma/client";
import type { FigureData } from "@/components/figures";
import type { MarkingPoint } from "./marking";

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

/** Shows "6.21e-21" as "6.21 × 10⁻²¹"; leaves other answers unchanged. */
export function formatNumericAnswer(value: string): string {
  const match = value.match(/^(-?[\d.]+)e([+-]?\d+)$/i);
  if (!match) return value;
  const exponent = String(Number(match[2])).replace(/[-\d]/g, (c) => SUPERSCRIPT_DIGITS[c]);
  return `${match[1]} × 10${exponent}`;
}

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
    modelAnswer = part.correctAnswer && formatNumericAnswer(part.correctAnswer);
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
    figures: (part.figures ?? []) as unknown as FigureData[],
  };
}

export type PublicPart = ReturnType<typeof publicPart>;

import type { MarkingPoint } from "./marking";
import {
  evaluateExpression,
  hashSeed,
  renderTemplate,
  shuffledOrder,
  variableValues,
  type Variables,
} from "./variants";

export interface ResolvedOption {
  /** The option's key in the content, which is what gets stored and marked. */
  key: string;
  /** The letter shown to the student, after shuffling. */
  displayKey: string;
  text: string;
}

export interface VariablePart {
  id: string;
  prompt: string;
  answerType: string;
  options: unknown;
  correctAnswer: string | null;
  markingPoints: unknown;
  examinerComment: string;
  variables: unknown;
  answerExpression: string | null;
}

/** The seed for one part within a practice set or test. Seed 0 stays 0 (as published). */
export function partSeed(baseSeed: number, partId: string): number {
  return baseSeed === 0 ? 0 : hashSeed(baseSeed, partId);
}

export function hasVariants(part: Pick<VariablePart, "variables" | "answerType">): boolean {
  return Object.keys((part.variables ?? {}) as object).length > 0 || part.answerType === "MULTIPLE_CHOICE";
}

/**
 * The version of a part a student sees for a given seed: numbers filled in,
 * multiple-choice options shuffled and relabelled, and the answer and mark
 * scheme recalculated to match.
 */
export function resolvePart<P extends VariablePart>(
  part: P,
  seed: number,
): Omit<P, "options" | "markingPoints"> & {
  options: ResolvedOption[] | null;
  markingPoints: MarkingPoint[];
  seed: number;
} {
  const variables = (part.variables ?? {}) as Variables;
  const templated = Object.keys(variables).length > 0;
  const values = variableValues(variables, seed);
  const render = (text: string) => (templated ? renderTemplate(text, values) : text);

  let markingPoints = (part.markingPoints as MarkingPoint[]).map((p) => ({ ...p, text: render(p.text) }));
  let options: ResolvedOption[] | null = null;
  const source = part.options as { key: string; text: string }[] | null;
  if (source?.length) {
    const order = part.answerType === "MULTIPLE_CHOICE" ? shuffledOrder(source.length, seed) : source.map((_, i) => i);
    options = order.map((index, position) => ({
      key: source[index].key,
      displayKey: String.fromCharCode(65 + position),
      text: render(source[index].text),
    }));
    // Mark scheme lines such as "C – respiration" use the letter the student saw.
    const shown = new Map(options.map((o) => [o.key, o.displayKey]));
    markingPoints = markingPoints.map((p) => {
      const match = p.text.match(/^([A-Z]) – /);
      return match && shown.has(match[1]) ? { ...p, text: shown.get(match[1]) + p.text.slice(1) } : p;
    });
  }

  const correctAnswer = part.answerExpression
    ? String(Number.parseFloat(evaluateExpression(part.answerExpression, values).toPrecision(12)))
    : part.correctAnswer;

  return {
    ...part,
    prompt: render(part.prompt),
    examinerComment: render(part.examinerComment),
    options,
    markingPoints,
    correctAnswer,
    seed,
  };
}

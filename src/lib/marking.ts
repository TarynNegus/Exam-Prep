// Pure marking logic. Objective answers (multiple choice, numeric, short text
// that matches an accepted answer) are marked automatically. Everything else is
// marked by the student against the mark scheme's marking points.

export type AnswerType = "MULTIPLE_CHOICE" | "NUMERIC" | "SHORT_TEXT" | "EXTENDED";

export interface MarkingPoint {
  text: string;
  marks: number;
}

export interface MarkablePart {
  answerType: AnswerType;
  marks: number;
  correctAnswer: string | null;
  tolerance: number | null;
  /** Extra tolerance as a fraction of the answer, for questions whose numbers vary. */
  relativeTolerance?: number | null;
  acceptedAnswers: string[];
}

export interface MarkResult {
  /** Marks awarded so far (0 when the answer awaits self-marking). */
  awardedMarks: number;
  /** False when the student must self-mark against the mark scheme. */
  autoMarked: boolean;
}

const SUPERSCRIPTS: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁻": "-",
  "⁺": "+",
};

/**
 * Parses "1,250", "-3.5", "3/4", "12 cm", "$31,667", and standard form such as "2.0e11",
 * "2.0 × 10^11", "2.0x10^-5" or "2.0 × 10⁻⁵". Returns null if no number is found.
 */
export function parseNumeric(raw: string): number | null {
  const text = raw
    .trim()
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, (sup) => "^" + [...sup].map((c) => SUPERSCRIPTS[c]).join(""))
    .replace(/[\s,]/g, "")
    .replace(/[−–]/g, "-")
    .replace(/^(-?)[$£€¥]/, "$1"); // currency sign before the number
  const fraction = text.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }
  const number = text.match(/^(-?(?:\d+(?:\.\d*)?|\.\d+))(?:[eE]([+-]?\d+)|[x×*]10\^?([+-]?\d+))?/);
  if (!number) return null;
  const exponent = number[2] ?? number[3];
  return Number(exponent === undefined ? number[1] : `${number[1]}e${exponent}`);
}

export function normaliseText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s.,;:!?"']+|[\s.,;:!?"']+$/g, "");
}

export function markResponse(part: MarkablePart, response: string): MarkResult {
  if (response.trim() === "") return { awardedMarks: 0, autoMarked: true };

  switch (part.answerType) {
    case "MULTIPLE_CHOICE": {
      const correct = response.trim().toUpperCase() === (part.correctAnswer ?? "").trim().toUpperCase();
      return { awardedMarks: correct ? part.marks : 0, autoMarked: true };
    }
    case "NUMERIC": {
      const value = parseNumeric(response);
      const expected = parseNumeric(part.correctAnswer ?? "");
      // The tiny relative allowance absorbs floating-point error without
      // accepting wrong answers to very small quantities.
      if (
        value !== null &&
        expected !== null &&
        Math.abs(value - expected) <=
          (part.tolerance ?? 0) + Math.abs(expected) * ((part.relativeTolerance ?? 0) + 1e-9)
      ) {
        return { awardedMarks: part.marks, autoMarked: true };
      }
      // A wrong final answer may still earn method marks, so let the student
      // check their working against the mark scheme.
      return { awardedMarks: 0, autoMarked: false };
    }
    case "SHORT_TEXT": {
      const given = normaliseText(response);
      if (part.acceptedAnswers.some((accepted) => normaliseText(accepted) === given)) {
        return { awardedMarks: part.marks, autoMarked: true };
      }
      return { awardedMarks: 0, autoMarked: false };
    }
    case "EXTENDED":
      return { awardedMarks: 0, autoMarked: false };
  }
}

/** Score for the marking points a student ticked, capped at the part's marks. */
export function selfMarkScore(points: MarkingPoint[], ticked: number[], maxMarks: number): number {
  const unique = new Set(ticked.filter((i) => Number.isInteger(i) && i >= 0 && i < points.length));
  const total = [...unique].reduce((sum, i) => sum + points[i].marks, 0);
  return Math.min(total, maxMarks);
}

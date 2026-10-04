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
  acceptedAnswers: string[];
}

export interface MarkResult {
  /** Marks awarded so far (0 when the answer awaits self-marking). */
  awardedMarks: number;
  /** False when the student must self-mark against the mark scheme. */
  autoMarked: boolean;
}

/** Parses "1,250", "-3.5", "3/4", "12 cm" etc. Returns null if no number found. */
export function parseNumeric(raw: string): number | null {
  const text = raw.trim().replace(/[\s,]/g, "");
  const fraction = text.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }
  const number = text.match(/^-?(?:\d+(?:\.\d*)?|\.\d+)/);
  return number ? Number(number[0]) : null;
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
      if (value !== null && expected !== null && Math.abs(value - expected) <= (part.tolerance ?? 0) + 1e-9) {
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

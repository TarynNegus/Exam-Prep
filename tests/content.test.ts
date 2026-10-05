import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contentFileSchema } from "@/lib/content-schema";
import { markResponse } from "@/lib/marking";
import { resolvePart } from "@/lib/resolve-part";
import { evaluateExpression, formatValue, variableValues } from "@/lib/variants";

const dir = join(__dirname, "..", "content");

describe.each(readdirSync(dir).filter((f) => f.endsWith(".json")))("content/%s", (file) => {
  const content = contentFileSchema.parse(JSON.parse(readFileSync(join(dir, file), "utf8")));
  const parts = content.papers.flatMap((p) => p.questions.flatMap((q) => q.parts));

  it("has mark schemes covering each part's marks", () => {
    for (const part of parts) {
      const total = part.markingPoints.reduce((sum, mp) => sum + mp.marks, 0);
      expect(total, `${part.prompt.slice(0, 40)}`).toBeGreaterThanOrEqual(part.marks);
    }
  });

  it("has number templates that are consistent for every version", () => {
    const templated = parts.filter((p) => Object.keys(p.variables).length > 0);
    for (const [i, part] of templated.entries()) {
      const label = part.prompt.slice(0, 50);
      const stored = {
        id: `t${i}`, prompt: part.prompt, answerType: part.answerType, options: part.options ?? null,
        correctAnswer: part.correctAnswer ?? null, markingPoints: part.markingPoints, examinerComment: part.examinerComment,
        variables: part.variables, answerExpression: part.answerExpression ?? null,
      };
      if (part.answerExpression) {
        // The published answer matches the formula at the published values.
        const base = evaluateExpression(part.answerExpression, variableValues(part.variables, 0));
        expect(Math.abs(base - Number(part.correctAnswer)), label).toBeLessThanOrEqual(
          (part.tolerance ?? 0) + Math.abs(base) * ((part.relativeTolerance ?? 0) + 1e-9),
        );
      }
      for (let seed = 1; seed <= 40; seed++) {
        const shown = resolvePart(stored, seed);
        const text = [shown.prompt, ...shown.markingPoints.map((m) => m.text), ...(shown.options ?? []).map((o) => o.text)].join(" ");
        expect(text, label).not.toMatch(/\{[A-Za-z_=][^}]*\}/);
        if (part.answerType === "NUMERIC") {
          const markable = { ...part, correctAnswer: shown.correctAnswer, tolerance: part.tolerance ?? null, acceptedAnswers: [] };
          // A student typing the answer to 6 significant figures gets full marks.
          expect(markResponse(markable, formatValue(Number(shown.correctAnswer))).awardedMarks, `${label} seed ${seed}`).toBe(part.marks);
        }
      }
    }
  });

  it("has an image file for every figure", () => {
    const figures = content.papers.flatMap((p) => p.questions.flatMap((q) => [...q.figures, ...q.parts.flatMap((part) => part.figures)]));
    for (const figure of figures) {
      expect(existsSync(join(__dirname, "..", "public", "figures", figure.src)), figure.src).toBe(true);
    }
  });

  it("auto-marks its own model answers as correct", () => {
    for (const part of parts) {
      const model = part.answerType === "SHORT_TEXT" ? part.acceptedAnswers?.[0] : part.correctAnswer;
      if (part.answerType === "EXTENDED" || model === undefined) continue;
      const markable = {
        answerType: part.answerType,
        marks: part.marks,
        correctAnswer: part.correctAnswer ?? null,
        tolerance: part.tolerance ?? null,
        acceptedAnswers: part.acceptedAnswers ?? [],
      };
      expect(markResponse(markable, model).awardedMarks, part.prompt.slice(0, 40)).toBe(part.marks);
    }
  });
});

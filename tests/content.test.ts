import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contentFileSchema } from "@/lib/content-schema";
import { markResponse } from "@/lib/marking";

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

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contentFileSchema } from "@/lib/content-schema";
import { toContentPaper, type Extraction } from "@/lib/paper-extraction";

const base = {
  options: [], correctAnswer: "", tolerance: null, acceptedAnswers: [], examinerComment: "", needsDiagram: false,
  markingPoints: [{ text: "B1", marks: 1 }],
};
const extraction: Extraction = {
  warnings: [],
  questions: [
    {
      number: 1,
      stem: "",
      parts: [
        { ...base, label: "", topic: "2", prompt: "Which is in plant cells only?", marks: 1, answerType: "MULTIPLE_CHOICE",
          options: [{ key: "A", text: "cell wall" }, { key: "B", text: "ribosome" }], correctAnswer: "A" },
      ],
    },
    {
      number: 2,
      stem: "The graph shows enzyme activity.",
      parts: [
        { ...base, label: "(a)", topic: "5", prompt: "Read the optimum from the graph.", marks: 1, answerType: "NUMERIC", correctAnswer: "37", needsDiagram: true },
        { ...base, label: "(b)", topic: "5", prompt: "Explain denaturation.", marks: 2, answerType: "EXTENDED" },
      ],
    },
    { number: 3, stem: "", parts: [{ ...base, label: "", topic: "1", prompt: "Label the map.", marks: 2, answerType: "EXTENDED", needsDiagram: true }] },
  ],
};

describe("toContentPaper", () => {
  const info = { component: "2", series: "June 2024", variant: "22", title: "June 2024 Paper 22" };
  const { paper, skipped } = toContentPaper(extraction, info);

  it("skips parts that need a diagram and drops empty questions", () => {
    expect(skipped).toEqual(["Q2(a): needs a diagram", "Q3: needs a diagram"]);
    expect(paper.questions.map((q) => q.number)).toEqual([1, 2]);
    expect(paper.questions[1].parts.map((p) => p.label)).toEqual(["(b)"]);
  });

  it("keeps only the fields each answer type uses", () => {
    expect(paper.questions[0].parts[0]).toMatchObject({ options: [{ key: "A", text: "cell wall" }, { key: "B", text: "ribosome" }], correctAnswer: "A" });
    expect(paper.questions[1].parts[0]).not.toHaveProperty("options");
    expect(paper.questions[1].parts[0]).not.toHaveProperty("correctAnswer");
  });

  it("produces a paper that validates against its subject", () => {
    const subject = JSON.parse(readFileSync(join(__dirname, "..", "content", "igcse-0610-biology.json"), "utf8"));
    expect(contentFileSchema.safeParse({ ...subject, papers: [paper] }).success).toBe(true);
  });
});

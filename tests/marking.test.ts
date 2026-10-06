import { describe, expect, it } from "vitest";
import { evaluateResponse, markResponse, normaliseText, parseNumeric, selfMarkScore, type MarkablePart } from "@/lib/marking";

const base: MarkablePart = { answerType: "NUMERIC", marks: 2, correctAnswer: null, tolerance: null, acceptedAnswers: [] };

describe("parseNumeric", () => {
  it.each([
    ["42", 42],
    [" -3.5 ", -3.5],
    ["1,250", 1250],
    ["3/4", 0.75],
    ["12 cm", 12],
    [".5", 0.5],
    ["abc", null],
    ["1/0", null],
    ["2.0e11", 2.0e11],
    ["1.26e+05", 1.26e5],
    ["2.0 × 10^11 Pa", 2.0e11],
    ["2.0x10^-5", 2.0e-5],
    ["6.2 × 10⁻²¹ J", 6.2e-21],
    ["−4", -4],
    ["$31,667", 31667],
    ["£4.50", 4.5],
    ["-$20", -20],
  ])("parses %j", (input, expected) => {
    expect(parseNumeric(input)).toBe(expected);
  });
});

describe("markResponse", () => {
  it("marks multiple choice case-insensitively", () => {
    const part = { ...base, answerType: "MULTIPLE_CHOICE" as const, marks: 1, correctAnswer: "C" };
    expect(markResponse(part, "c")).toEqual({ awardedMarks: 1, autoMarked: true });
    expect(markResponse(part, "B")).toEqual({ awardedMarks: 0, autoMarked: true });
  });

  it("accepts numeric answers within tolerance", () => {
    const part = { ...base, correctAnswer: "6.283", tolerance: 0.01 };
    expect(markResponse(part, "6.28")).toEqual({ awardedMarks: 2, autoMarked: true });
    expect(markResponse(part, "6.3")).toEqual({ awardedMarks: 0, autoMarked: false });
  });

  it("compares very small answers by their size, not a fixed allowance", () => {
    const part = { ...base, correctAnswer: "6.21e-21", tolerance: 0.02e-21 };
    expect(markResponse(part, "6.2 × 10⁻²¹").awardedMarks).toBe(2);
    expect(markResponse(part, "0").awardedMarks).toBe(0);
    expect(markResponse(part, "6.2e-20").awardedMarks).toBe(0);
  });

  it("accepts equivalent numeric forms", () => {
    const part = { ...base, correctAnswer: "-0.5" };
    expect(markResponse(part, "-1/2").awardedMarks).toBe(2);
  });

  it("sends wrong numeric answers to self-marking for method marks", () => {
    const part = { ...base, correctAnswer: "8" };
    expect(markResponse(part, "7")).toEqual({ awardedMarks: 0, autoMarked: false });
  });

  it("matches short text against accepted answers ignoring case and spacing", () => {
    const part = { ...base, answerType: "SHORT_TEXT" as const, acceptedAnswers: ["4n + 3"] };
    expect(markResponse(part, "  4N  + 3.")).toEqual({ awardedMarks: 2, autoMarked: true });
    expect(markResponse(part, "4n+7")).toEqual({ awardedMarks: 0, autoMarked: false });
  });

  it("always self-marks extended answers", () => {
    expect(markResponse({ ...base, answerType: "EXTENDED" }, "some working")).toEqual({ awardedMarks: 0, autoMarked: false });
  });

  it("gives zero for blank answers without self-marking", () => {
    expect(markResponse({ ...base, answerType: "EXTENDED" }, "   ")).toEqual({ awardedMarks: 0, autoMarked: true });
  });
});

describe("selfMarkScore", () => {
  const points = [
    { text: "M1", marks: 1 },
    { text: "M1", marks: 1 },
    { text: "A1", marks: 1 },
  ];
  it("sums ticked points", () => expect(selfMarkScore(points, [0, 2], 3)).toBe(2));
  it("ignores duplicates and invalid indexes", () => expect(selfMarkScore(points, [0, 0, 5, -1], 3)).toBe(1));
  it("caps at the available marks", () => expect(selfMarkScore([...points, { text: "alt", marks: 2 }], [0, 1, 2, 3], 3)).toBe(3));
});

describe("normaliseText", () => {
  it("lowercases, collapses spaces and trims punctuation", () => expect(normaliseText("  Hello   World. ")).toBe("hello world"));
});

describe("formatNumericAnswer", () => {
  it("writes standard form with superscript powers", async () => {
    const { formatNumericAnswer } = await import("@/lib/feedback");
    expect(formatNumericAnswer("6.21e-21")).toBe("6.21 × 10⁻²¹");
    expect(formatNumericAnswer("1.26e+05")).toBe("1.26 × 10⁵");
    expect(formatNumericAnswer("5400")).toBe("5400");
  });
});

describe("evaluateResponse", () => {
  it.each([
    ["42", 42],
    ["1,250", 1250],
    ["3/4", 0.75],
    ["12 cm", 12],
    ["2.0 × 10^11 Pa", 2.0e11],
    ["2.0x10^-5", 2.0e-5],
    ["2.4X10^3", 2400],
    ["6.2 × 10⁻²¹ J", 6.2e-21],
    ["$31,667", 31667],
    ["-$20", -20],
    ["45%", 45],
    ["30°", 30],
    ["3.2 m/s", 3.2],
    ["√50", Math.sqrt(50)],
    ["2√3", 2 * Math.sqrt(3)],
    ["√(16)", 4],
    ["∛27", 3],
    ["5²", 25],
    ["2³", 8],
    ["3π", 3 * Math.PI],
    ["2π cm", 2 * Math.PI],
    ["4^(1/2)", 2],
    ["(3+5)÷2", 4],
    ["7 − 2", 5],
    ["abc", null],
    ["1/0", null],
    ["", null],
  ])("evaluates %j", (input, expected) => {
    const value = evaluateResponse(input);
    if (expected === null) expect(value).toBeNull();
    else expect(value).toBeCloseTo(expected as number, 9);
  });
});

describe("marking typed calculations", () => {
  it("accepts a surd for a decimal answer", () => {
    expect(markResponse({ ...base, correctAnswer: "3.4641", tolerance: 0.001 }, "2√3").awardedMarks).toBe(2);
  });
  it("accepts symbols in chemical formulae", () => {
    const part = { ...base, answerType: "SHORT_TEXT" as const, acceptedAnswers: ["H2O", "Fe3+"] };
    expect(markResponse(part, "H₂O").awardedMarks).toBe(2);
    expect(markResponse(part, "Fe³⁺").awardedMarks).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { choosePracticeSet, newSetParam, parseSetParam, PRACTICE_SET_SIZE } from "@/lib/practice-set";
import { partSeed, resolvePart } from "@/lib/resolve-part";
import { formatValue, hashSeed, renderTemplate, seededRandom, shuffledOrder, variableValues } from "@/lib/variants";

describe("seeded randomness", () => {
  it("is repeatable for the same seed and differs between seeds", () => {
    const a = seededRandom(42), b = seededRandom(42), c = seededRandom(43);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
  });

  it("hashes to a non-zero seed", () => {
    expect(hashSeed("x", 1)).toBe(hashSeed("x", 1));
    expect(hashSeed("x", 1)).not.toBe(hashSeed("x", 2));
    expect(hashSeed("")).toBeGreaterThan(0);
  });
});

describe("variableValues", () => {
  const vars = { r: { min: 3, max: 12, value: 9 }, h: { min: 0.5, max: 2.5, step: 0.1, value: 1.2 } };

  it("uses the published values for seed 0", () => {
    expect(variableValues(vars, 0)).toEqual({ h: 1.2, r: 9 });
  });

  it("picks values within range on the step grid", () => {
    for (let seed = 1; seed < 200; seed++) {
      const { r, h } = variableValues(vars, seed);
      expect(r).toBeGreaterThanOrEqual(3); expect(r).toBeLessThanOrEqual(12); expect(Number.isInteger(r)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0.5); expect(h).toBeLessThanOrEqual(2.5);
      expect(Math.abs(h * 10 - Math.round(h * 10))).toBeLessThan(1e-9);
    }
  });

  it("varies with the seed", () => {
    const values = new Set(Array.from({ length: 50 }, (_, i) => variableValues(vars, i + 1).r));
    expect(values.size).toBeGreaterThan(5);
  });
});

describe("renderTemplate", () => {
  it("fills variables and expressions", () => {
    expect(renderTemplate("Radius {r} cm, area {=round(pi*r^2, 1)} cm²", { r: 3 })).toBe("Radius 3 cm, area 28.3 cm²");
  });
  it("leaves unknown placeholders and plain braces alone", () => {
    expect(renderTemplate("{x} and {set}", { r: 1 })).toBe("{x} and {set}");
  });
  it("formats computed values without floating-point noise", () => {
    expect(formatValue(0.1 + 0.2)).toBe("0.3");
    expect(formatValue(6.21e-21)).toBe("6.21e-21");
  });
});

describe("shuffledOrder", () => {
  it("keeps the order for seed 0 and returns a permutation otherwise", () => {
    expect(shuffledOrder(4, 0)).toEqual([0, 1, 2, 3]);
    for (let seed = 1; seed < 50; seed++) expect([...shuffledOrder(4, seed)].sort()).toEqual([0, 1, 2, 3]);
  });
});

const basePart = {
  id: "p1", prompt: "", answerType: "NUMERIC", options: null, correctAnswer: null, markingPoints: [], examinerComment: "",
  variables: {}, answerExpression: null,
};

describe("resolvePart", () => {
  const mcq = {
    ...basePart, answerType: "MULTIPLE_CHOICE", correctAnswer: "C",
    prompt: "Which process releases energy?",
    options: [{ key: "A", text: "excretion" }, { key: "B", text: "nutrition" }, { key: "C", text: "respiration" }, { key: "D", text: "sensitivity" }],
    markingPoints: [{ text: "C – respiration", marks: 1 }],
  };

  it("leaves the published version unchanged for seed 0", () => {
    const part = resolvePart(mcq, 0);
    expect(part.options!.map((o) => o.displayKey + o.key)).toEqual(["AA", "BB", "CC", "DD"]);
    expect(part.markingPoints[0].text).toBe("C – respiration");
  });

  it("shuffles options, relabels them A–D and updates the mark scheme letter", () => {
    const seeds = Array.from({ length: 30 }, (_, i) => i + 1);
    const shownLetters = new Set<string>();
    for (const seed of seeds) {
      const part = resolvePart(mcq, seed);
      expect(part.options!.map((o) => o.displayKey)).toEqual(["A", "B", "C", "D"]);
      const correct = part.options!.find((o) => o.key === "C")!;
      expect(correct.text).toBe("respiration");
      expect(part.markingPoints[0].text).toBe(`${correct.displayKey} – respiration`);
      expect(part.correctAnswer).toBe("C"); // stored and marked by content key
      shownLetters.add(correct.displayKey);
    }
    expect(shownLetters.size).toBeGreaterThan(1);
  });

  it("fills numbers and recalculates the answer", () => {
    const template = {
      ...basePart,
      prompt: "A sector has radius {r} cm and angle 40°. Find the arc length.",
      variables: { r: { min: 3, max: 12, value: 9 } },
      answerExpression: "40/360*2*pi*r",
      correctAnswer: "6.283",
      markingPoints: [{ text: "M1 for (40/360) × 2 × π × {r}", marks: 1 }, { text: "A1 for {=round(40/360*2*pi*r, 2)}", marks: 1 }],
    };
    expect(resolvePart(template, 0).prompt).toContain("radius 9 cm");
    for (let seed = 1; seed < 20; seed++) {
      const part = resolvePart(template, seed);
      const r = Number(part.prompt.match(/radius (\d+)/)![1]);
      expect(Number(part.correctAnswer)).toBeCloseTo((40 / 360) * 2 * Math.PI * r, 6);
      expect(part.markingPoints[0].text).toBe(`M1 for (40/360) × 2 × π × ${r}`);
    }
  });

  it("gives each part of a set its own seed", () => {
    expect(partSeed(0, "a")).toBe(0);
    expect(partSeed(7, "a")).not.toBe(partSeed(7, "b"));
  });
});

describe("choosePracticeSet", () => {
  const questions = Array.from({ length: 12 }, (_, i) => ({ id: `q${i}`, partIds: [`p${i}`] }));

  it("puts questions not yet tried first", () => {
    const scores = new Map(questions.slice(0, 10).map((q) => [q.partIds[0], 1]));
    const set = choosePracticeSet(questions, scores, 99);
    expect(set).toHaveLength(PRACTICE_SET_SIZE);
    expect(set.map((q) => q.id)).toEqual(expect.arrayContaining(["q10", "q11"]));
  });

  it("then prefers the lowest scores", () => {
    const scores = new Map(questions.map((q, i) => [q.partIds[0], i < 3 ? 0 : 1]));
    expect(choosePracticeSet(questions, scores, 5).map((q) => q.id)).toEqual(expect.arrayContaining(["q0", "q1", "q2"]));
  });

  it("is stable for a seed and varies between seeds", () => {
    const empty = new Map<string, number>();
    expect(choosePracticeSet(questions, empty, 1)).toEqual(choosePracticeSet(questions, empty, 1));
    const sets = new Set(Array.from({ length: 10 }, (_, i) => choosePracticeSet(questions, empty, i + 1).map((q) => q.id).sort().join()));
    expect(sets.size).toBeGreaterThan(1);
  });

  it("round-trips the set parameter", () => {
    expect(parseSetParam(newSetParam(12345, 1700000000000))).toEqual({ seed: 12345, dealtAt: new Date(1700000000000) });
    expect(parseSetParam("nonsense")).toBeNull();
    expect(parseSetParam(undefined)).toBeNull();
  });
});

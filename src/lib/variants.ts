// Seeded variation of questions so practice sets and tests cannot simply be
// memorised. Seed 0 always means "as published": original numbers and option
// order. Any other seed gives a reproducible variant, so the server can
// re-create exactly what a student saw when it marks their answer.

import { all, create } from "mathjs";

const math = create(all, {});
const evaluate = math.evaluate.bind(math);
// Content expressions only need arithmetic and functions: disable the parts of
// mathjs that can change its own behaviour.
math.import(
  {
    import: () => {
      throw new Error("import is disabled");
    },
    createUnit: () => {
      throw new Error("createUnit is disabled");
    },
  },
  { override: true },
);

export interface VariableSpec {
  min: number;
  max: number;
  step?: number;
  /** The value used in the published version of the question (seed 0). */
  value: number;
}

export type Variables = Record<string, VariableSpec>;

/** Seeds are stored in 32-bit signed database columns, so they stay below 2³¹. */
export const MAX_SEED = 0x7fffffff;

/** FNV-1a hash of the inputs, as a non-zero seed below 2³¹. */
export function hashSeed(...inputs: (string | number)[]): number {
  let hash = 0x811c9dc5;
  for (const char of inputs.join("|")) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) & MAX_SEED || 1;
}

/** Mulberry32: a small, fast seeded random number generator returning [0, 1). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh random seed (never 0, which is reserved for the published version). */
export function randomSeed(): number {
  return Math.floor(Math.random() * MAX_SEED) + 1;
}

/** Removes floating-point noise, e.g. 0.30000000000000004 → 0.3. */
function tidy(value: number): number {
  return Number.parseFloat(value.toPrecision(12));
}

/** Picks a value for each variable. Seed 0 returns the published values. */
export function variableValues(variables: Variables, seed: number): Record<string, number> {
  const names = Object.keys(variables).sort();
  if (seed === 0) return Object.fromEntries(names.map((name) => [name, variables[name].value]));
  const random = seededRandom(seed);
  return Object.fromEntries(
    names.map((name) => {
      const { min, max, step = 1 } = variables[name];
      const count = Math.floor(tidy((max - min) / step)) + 1;
      return [name, tidy(min + Math.floor(random() * count) * step)];
    }),
  );
}

export function evaluateExpression(expression: string, values: Record<string, number>): number {
  const result = evaluate(expression, { ...values });
  const value = typeof result === "number" ? result : Number(result?.valueOf?.());
  if (!Number.isFinite(value)) throw new Error(`Expression "${expression}" did not give a number`);
  return value;
}

/** Formats a computed number for display: up to 6 significant figures, no trailing zeros. */
export function formatValue(value: number): string {
  return String(Number.parseFloat(value.toPrecision(6)));
}

/** Replaces {name} with a variable's value and {=expression} with the evaluated result. */
export function renderTemplate(text: string, values: Record<string, number>): string {
  return text
    .replace(/\{=([^{}]+)\}/g, (_, expression: string) => formatValue(evaluateExpression(expression, values)))
    .replace(/\{([A-Za-z_]\w*)\}/g, (match, name: string) => (name in values ? formatValue(values[name]) : match));
}

/** A seeded permutation of 0..n-1. Seed 0 keeps the original order. */
export function shuffledOrder(n: number, seed: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  if (seed === 0) return order;
  const random = seededRandom(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

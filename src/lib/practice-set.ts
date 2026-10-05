// Chooses which questions appear in a practice set. Questions the student has
// not tried come first, then those they scored worst on; ties are broken by
// the set's seed, so every set is different but stays the same on reload.

import { hashSeed, MAX_SEED } from "./variants";

/** Number of questions in a practice set. */
export const PRACTICE_SET_SIZE = 5;

export interface SetQuestion {
  id: string;
  partIds: string[];
}

/**
 * @param scores each part's latest score as a fraction of its marks, from
 *   answers given before the set was dealt
 */
export function choosePracticeSet<Q extends SetQuestion>(
  questions: Q[],
  scores: Map<string, number>,
  seed: number,
): Q[] {
  const priority = (q: Q) => {
    const known = q.partIds.filter((id) => scores.has(id)).map((id) => scores.get(id)!);
    if (known.length < q.partIds.length) return 0; // not tried yet
    return 1 + known.reduce((a, b) => a + b, 0) / known.length;
  };
  const chosen = [...questions]
    .sort((a, b) => priority(a) - priority(b) || hashSeed(seed, a.id) - hashSeed(seed, b.id))
    .slice(0, PRACTICE_SET_SIZE);
  return chosen.sort((a, b) => hashSeed(seed, "order", a.id) - hashSeed(seed, "order", b.id));
}

/** A set is identified by "<seed>-<time dealt>", so reloading keeps the same set. */
export function parseSetParam(value: string | undefined): { seed: number; dealtAt: Date } | null {
  const match = value?.match(/^(\d+)-(\d+)$/);
  if (!match) return null;
  const seed = Number(match[1]);
  const dealtAt = new Date(Number(match[2]));
  return seed > 0 && seed <= MAX_SEED && !Number.isNaN(dealtAt.getTime()) ? { seed, dealtAt } : null;
}

export function newSetParam(seed: number, now = Date.now()): string {
  return `${seed}-${now}`;
}

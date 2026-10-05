import "server-only";
import type { PaperAttempt } from "@prisma/client";
import { db } from "./db";
import { hashSeed } from "./variants";

const questionInclude = { parts: { orderBy: { position: "asc" as const }, include: { topic: true } } };

/**
 * The questions, title and time allowed for an attempt: either a fixed past
 * paper, or a practice test drawn at random from a component's question pool.
 */
export async function loadAttemptContent(attempt: PaperAttempt) {
  if (attempt.paperId) {
    const paper = await db.pastPaper.findUniqueOrThrow({
      where: { id: attempt.paperId },
      include: {
        component: { include: { subject: true } },
        questions: { orderBy: { number: "asc" }, include: questionInclude },
      },
    });
    return {
      title: paper.title,
      component: paper.component,
      durationMin: paper.component.durationMin,
      questions: paper.questions,
    };
  }

  const component = await db.component.findUniqueOrThrow({
    where: { id: attempt.componentId! },
    include: { subject: true },
  });
  const ids = attempt.questionIds as string[];
  const found = await db.question.findMany({ where: { id: { in: ids } }, include: questionInclude });
  const questions = ids.flatMap((id) => found.filter((q) => q.id === id));
  return {
    title: `${component.title} – practice test`,
    component,
    durationMin: testDuration(component, questions),
    questions,
  };
}

/** Time allowed in proportion to the marks drawn, at least 10 minutes. */
export function testDuration(
  component: { durationMin: number; totalMarks: number },
  questions: { parts: { marks: number }[] }[],
) {
  const marks = questions.reduce((sum, q) => sum + q.parts.reduce((m, p) => m + p.marks, 0), 0);
  return Math.max(
    10,
    Math.round((component.durationMin * Math.min(marks, component.totalMarks)) / component.totalMarks),
  );
}

/**
 * Draws questions for a practice test: a seeded shuffle of the component's
 * question pool, taken until the component's total marks are reached.
 */
export function drawTestQuestions<Q extends { id: string; parts: { marks: number }[] }>(
  pool: Q[],
  totalMarks: number,
  seed: number,
): Q[] {
  const shuffled = [...pool].sort((a, b) => hashSeed(seed, a.id) - hashSeed(seed, b.id));
  const chosen: Q[] = [];
  let marks = 0;
  for (const question of shuffled) {
    if (marks >= totalMarks) break;
    chosen.push(question);
    marks += question.parts.reduce((m, p) => m + p.marks, 0);
  }
  return chosen;
}

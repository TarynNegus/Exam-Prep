"use server";

import { redirect } from "next/navigation";
import { drawTestQuestions, loadAttemptContent } from "./attempts";
import { db } from "./db";
import { markResponse } from "./marking";
import { partSeed, resolvePart } from "./resolve-part";
import { requireUser } from "./session";
import { canSitPaper, canStartPracticeTest } from "./topic-access";
import { randomSeed } from "./variants";

/** Starts a fixed past paper, exactly as published. */
export async function startPaper(paperId: string) {
  const user = await requireUser();
  if (!(await canSitPaper(user, paperId))) redirect("/dashboard");
  const attempt = await db.paperAttempt.create({ data: { userId: user.id, paperId } });
  redirect(`/attempts/${attempt.id}`);
}

/**
 * Starts a practice test for a component: questions drawn at random from all
 * of the component's papers, in a random order, with varied numbers and
 * shuffled multiple-choice options.
 */
export async function startPracticeTest(componentId: string) {
  const user = await requireUser();
  const component = await canStartPracticeTest(user, componentId);
  if (!component) redirect("/dashboard");

  const pool = await db.question.findMany({
    where: { paper: { componentId } },
    select: { id: true, parts: { select: { marks: true } } },
  });
  const seed = randomSeed();
  const questions = drawTestQuestions(pool, component.totalMarks, seed);
  const attempt = await db.paperAttempt.create({
    data: { userId: user.id, componentId, questionIds: questions.map((q) => q.id), seed },
  });
  redirect(`/attempts/${attempt.id}`);
}

export async function submitPaper(attemptId: string, responses: Record<string, string>) {
  const user = await requireUser();
  const attempt = await db.paperAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== user.id) throw new Error("Attempt not found");
  if (attempt.submittedAt) redirect(`/attempts/${attemptId}`);

  const { questions } = await loadAttemptContent(attempt);
  const parts = questions.flatMap((q) => q.parts);
  await db.$transaction([
    db.answer.createMany({
      data: parts.map((stored) => {
        const variantSeed = partSeed(attempt.seed, stored.id);
        const part = resolvePart(stored, variantSeed);
        const response = String(responses[part.id] ?? "").slice(0, 10_000);
        const result = markResponse(part, response);
        return {
          userId: user.id,
          partId: part.id,
          mode: "FULL_PAPER" as const,
          paperAttemptId: attemptId,
          response,
          awardedMarks: result.awardedMarks,
          pendingReview: !result.autoMarked,
          variantSeed,
        };
      }),
    }),
    db.paperAttempt.update({ where: { id: attemptId }, data: { submittedAt: new Date() } }),
  ]);
  redirect(`/attempts/${attemptId}`);
}

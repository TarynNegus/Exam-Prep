"use server";

import { redirect } from "next/navigation";
import { db } from "./db";
import { markResponse } from "./marking";
import { requireUser } from "./session";
import { canSitPaper } from "./topic-access";

export async function startPaper(paperId: string) {
  const user = await requireUser();
  if (!(await canSitPaper(user, paperId))) redirect("/dashboard");
  const attempt = await db.paperAttempt.create({ data: { userId: user.id, paperId } });
  redirect(`/attempts/${attempt.id}`);
}

export async function submitPaper(attemptId: string, responses: Record<string, string>) {
  const user = await requireUser();
  const attempt = await db.paperAttempt.findUnique({
    where: { id: attemptId },
    include: { paper: { include: { questions: { include: { parts: true } } } } },
  });
  if (!attempt || attempt.userId !== user.id) throw new Error("Attempt not found");
  if (attempt.submittedAt) redirect(`/attempts/${attemptId}`);

  const parts = attempt.paper.questions.flatMap((q) => q.parts);
  await db.$transaction([
    db.answer.createMany({
      data: parts.map((part) => {
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
        };
      }),
    }),
    db.paperAttempt.update({ where: { id: attemptId }, data: { submittedAt: new Date() } }),
  ]);
  redirect(`/attempts/${attemptId}`);
}

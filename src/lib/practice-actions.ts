"use server";

import { db } from "./db";
import { partFeedback, type PartFeedback } from "./feedback";
import { markResponse, selfMarkScore, type MarkingPoint } from "./marking";
import { requireUser } from "./session";
import { accessibleTopic } from "./topic-access";

export interface PracticeResult extends PartFeedback {
  answerId: string;
  awardedMarks: number;
  autoMarked: boolean;
  marks: number;
}

export async function submitPracticeAnswer(partId: string, response: string): Promise<PracticeResult> {
  const user = await requireUser();
  const part = await db.questionPart.findUnique({
    where: { id: partId },
    include: { question: { select: { paper: { select: { componentId: true } } } } },
  });
  const access = part && (await accessibleTopic(user, part.topicId));
  if (!part || !access || !access.componentIds.includes(part.question.paper.componentId)) {
    throw new Error("Question not available");
  }

  const trimmed = response.slice(0, 10_000);
  const result = markResponse(part, trimmed);
  const answer = await db.answer.create({
    data: {
      userId: user.id,
      partId,
      mode: "PRACTICE",
      response: trimmed,
      awardedMarks: result.awardedMarks,
      pendingReview: !result.autoMarked,
    },
  });
  return { answerId: answer.id, ...result, marks: part.marks, ...partFeedback(part) };
}

/** Records the marking points a student awarded themselves for a written answer. */
export async function submitSelfMark(answerId: string, ticked: number[]): Promise<{ awardedMarks: number }> {
  const user = await requireUser();
  const answer = await db.answer.findUnique({ where: { id: answerId }, include: { part: true } });
  if (!answer || answer.userId !== user.id || !answer.pendingReview) throw new Error("Answer not found");

  const points = answer.part.markingPoints as unknown as MarkingPoint[];
  const awardedMarks = selfMarkScore(points, ticked, answer.part.marks);
  await db.answer.update({
    where: { id: answerId },
    data: { awardedMarks, selfMarked: true, pendingReview: false },
  });
  return { awardedMarks };
}

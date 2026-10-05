import "server-only";
import type { User } from "@prisma/client";
import { db } from "./db";
import { loadSubjectProgress } from "./subject-progress";

/** Returns the topic if the user may practise it (unlocked and within their plan). */
export async function accessibleTopic(user: User, topicId: string) {
  const topic = await db.topic.findUnique({ where: { id: topicId } });
  if (!topic) return null;
  const data = await loadSubjectProgress(topic.subjectId, user);
  const view = data?.topics.find((t) => t.id === topicId);
  if (!data || !view || !view.unlocked || !view.inPlan) return null;
  return { topic, view, subject: data.subject, componentIds: data.componentIds };
}

/** Full papers require a subscription and every topic the paper assesses complete. */
export async function canSitPaper(user: User, paperId: string) {
  const paper = await db.pastPaper.findUnique({
    where: { id: paperId },
    include: { component: true },
  });
  if (!paper) return false;
  const data = await loadSubjectProgress(paper.component.subjectId, user);
  return !!data?.unlockedPapers.has(paperId);
}

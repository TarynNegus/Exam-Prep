import "server-only";
import type { User } from "@prisma/client";
import { hasSubscription } from "./access";
import { db } from "./db";
import {
  computeTopicProgress,
  fullPapersUnlocked,
  isTopicInPlan,
  overallPercent,
  unlockedTopicIds,
  type TopicProgress,
} from "./progress";

/** Most recent marked score per part (answers awaiting self-marking are ignored). */
export async function latestAwardedByPart(userId: string, partIds: string[]): Promise<Map<string, number>> {
  const answers = await db.answer.findMany({
    where: { userId, partId: { in: partIds }, pendingReview: false },
    orderBy: { createdAt: "desc" },
    select: { partId: true, awardedMarks: true },
  });
  const latest = new Map<string, number>();
  for (const answer of answers) {
    if (!latest.has(answer.partId)) latest.set(answer.partId, answer.awardedMarks);
  }
  return latest;
}

export interface TopicView {
  id: string;
  ref: string;
  title: string;
  summary: string;
  progress: TopicProgress;
  unlocked: boolean;
  inPlan: boolean;
}

export async function loadSubjectProgress(subjectId: string, user: User) {
  const subject = await db.subject.findUnique({
    where: { id: subjectId },
    include: {
      topics: { orderBy: { position: "asc" } },
      components: {
        orderBy: { ref: "asc" },
        include: { papers: { orderBy: [{ series: "asc" }, { variant: "asc" }] } },
      },
    },
  });
  if (!subject) return null;

  const parts = await db.questionPart.findMany({
    where: { topic: { subjectId } },
    select: { id: true, topicId: true, marks: true },
  });
  const latest = await latestAwardedByPart(
    user.id,
    parts.map((p) => p.id),
  );
  const topicIds = subject.topics.map((t) => t.id);
  const progress = computeTopicProgress(topicIds, parts, latest);
  const unlocked = unlockedTopicIds(topicIds, progress);
  const subscribed = hasSubscription(user);

  const topics: TopicView[] = subject.topics.map((topic, index) => ({
    id: topic.id,
    ref: topic.ref,
    title: topic.title,
    summary: topic.summary,
    progress: progress.get(topic.id)!,
    unlocked: unlocked.has(topic.id),
    inPlan: isTopicInPlan(index, subscribed),
  }));

  return {
    subject,
    topics,
    subscribed,
    overallPercent: overallPercent(progress),
    papersUnlocked: subscribed && fullPapersUnlocked(progress),
  };
}

import "server-only";
import type { User } from "@prisma/client";
import { hasSubscription } from "./access";
import { db } from "./db";
import {
  computeTopicProgress,
  isTopicInPlan,
  overallPercent,
  paperUnlocked,
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
  section: string;
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
    select: { id: true, topicId: true, marks: true, question: { select: { paperId: true } } },
  });
  const latest = await latestAwardedByPart(
    user.id,
    parts.map((p) => p.id),
  );
  const topicIds = subject.topics.map((t) => t.id);
  const progress = computeTopicProgress(topicIds, parts, latest);
  const unlocked = unlockedTopicIds(subject.topics, progress);
  const subscribed = hasSubscription(user);

  const sectionCounts = new Map<string, number>();
  const topics: TopicView[] = subject.topics.map((topic) => {
    const indexInSection = sectionCounts.get(topic.section) ?? 0;
    sectionCounts.set(topic.section, indexInSection + 1);
    return {
      id: topic.id,
      ref: topic.ref,
      title: topic.title,
      summary: topic.summary,
      section: topic.section,
      progress: progress.get(topic.id)!,
      unlocked: unlocked.has(topic.id),
      inPlan: isTopicInPlan(indexInSection, subscribed),
    };
  });

  // Each full paper opens when every topic it assesses is complete.
  const topicsByPaper = new Map<string, Set<string>>();
  for (const part of parts) {
    const set = topicsByPaper.get(part.question.paperId) ?? new Set<string>();
    set.add(part.topicId);
    topicsByPaper.set(part.question.paperId, set);
  }
  const unlockedPapers = new Set(
    subscribed
      ? [...topicsByPaper].filter(([, ids]) => paperUnlocked(ids, progress)).map(([paperId]) => paperId)
      : [],
  );

  return {
    subject,
    topics,
    subscribed,
    overallPercent: overallPercent(progress),
    unlockedPapers,
  };
}

// Pure progress logic: how far a student is through each syllabus topic, which
// topics are unlocked, and when full past papers become available.

/** Minimum score across attempted parts for a topic to count as complete. */
export const TOPIC_PASS_PERCENT = 60;
/** Minimum number of parts attempted before a topic can be complete. */
export const TOPIC_MIN_PARTS = 3;
/** Number of topics per subject available without a subscription. */
export const FREE_TOPICS_PER_SUBJECT = 2;

export type TopicStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";

export interface PartRef {
  id: string;
  topicId: string;
  marks: number;
}

export interface TopicProgress {
  topicId: string;
  totalParts: number;
  attemptedParts: number;
  marksAttempted: number;
  marksAwarded: number;
  scorePercent: number;
  status: TopicStatus;
}

/**
 * @param parts every practice part in the subject
 * @param latestAwarded the student's most recent marked score for each part id
 */
export function computeTopicProgress(
  topicIds: string[],
  parts: PartRef[],
  latestAwarded: Map<string, number>,
): Map<string, TopicProgress> {
  const result = new Map<string, TopicProgress>();
  for (const topicId of topicIds) {
    result.set(topicId, {
      topicId,
      totalParts: 0,
      attemptedParts: 0,
      marksAttempted: 0,
      marksAwarded: 0,
      scorePercent: 0,
      status: "NOT_STARTED",
    });
  }

  for (const part of parts) {
    const progress = result.get(part.topicId);
    if (!progress) continue;
    progress.totalParts += 1;
    const awarded = latestAwarded.get(part.id);
    if (awarded !== undefined) {
      progress.attemptedParts += 1;
      progress.marksAttempted += part.marks;
      progress.marksAwarded += awarded;
    }
  }

  for (const progress of result.values()) {
    progress.scorePercent =
      progress.marksAttempted === 0 ? 0 : Math.round((progress.marksAwarded / progress.marksAttempted) * 100);
    const required = Math.min(TOPIC_MIN_PARTS, progress.totalParts);
    if (progress.totalParts === 0) {
      progress.status = "COMPLETE"; // nothing to practise yet
    } else if (progress.attemptedParts === 0) {
      progress.status = "NOT_STARTED";
    } else if (progress.attemptedParts >= required && progress.scorePercent >= TOPIC_PASS_PERCENT) {
      progress.status = "COMPLETE";
    } else {
      progress.status = "IN_PROGRESS";
    }
  }
  return result;
}

/** Topics unlock in syllabus order: each requires the previous one complete. */
export function unlockedTopicIds(orderedTopicIds: string[], progress: Map<string, TopicProgress>): Set<string> {
  const unlocked = new Set<string>();
  for (const topicId of orderedTopicIds) {
    unlocked.add(topicId);
    if (progress.get(topicId)?.status !== "COMPLETE") break;
  }
  return unlocked;
}

/** Without a subscription only the first few topics of a subject are open. */
export function isTopicInPlan(topicIndex: number, hasSubscription: boolean): boolean {
  return hasSubscription || topicIndex < FREE_TOPICS_PER_SUBJECT;
}

/** Full past papers open once every topic in the syllabus is complete. */
export function fullPapersUnlocked(progress: Map<string, TopicProgress>): boolean {
  return [...progress.values()].every((p) => p.status === "COMPLETE");
}

export function overallPercent(progress: Map<string, TopicProgress>): number {
  const all = [...progress.values()];
  if (all.length === 0) return 0;
  return Math.round((all.filter((p) => p.status === "COMPLETE").length / all.length) * 100);
}

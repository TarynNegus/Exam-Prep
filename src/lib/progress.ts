// Pure progress logic: how far a student is through each syllabus topic, which
// topics are unlocked, and when full past papers become available.

/** Minimum score across attempted parts for a topic to count as complete. */
export const TOPIC_PASS_PERCENT = 60;
/** Minimum number of parts attempted before a topic can be complete. */
export const TOPIC_MIN_PARTS = 3;
/** Number of topics per section available without a subscription. */
export const FREE_TOPICS_PER_SECTION = 2;

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

/**
 * Topics unlock in syllabus order within their section: each requires the
 * previous topic in the same section to be complete. Sections are independent,
 * so students can follow the papers they are taking.
 */
export function unlockedTopicIds(
  orderedTopics: { id: string; section: string }[],
  progress: Map<string, TopicProgress>,
): Set<string> {
  const unlocked = new Set<string>();
  const blocked = new Set<string>();
  for (const { id, section } of orderedTopics) {
    if (blocked.has(section)) continue;
    unlocked.add(id);
    if (progress.get(id)?.status !== "COMPLETE") blocked.add(section);
  }
  return unlocked;
}

/** Without a subscription only the first few topics of each section are open. */
export function isTopicInPlan(indexInSection: number, hasSubscription: boolean): boolean {
  return hasSubscription || indexInSection < FREE_TOPICS_PER_SECTION;
}

/** A full past paper opens once every topic it assesses is complete. */
export function paperUnlocked(paperTopicIds: Iterable<string>, progress: Map<string, TopicProgress>): boolean {
  return [...paperTopicIds].every((id) => progress.get(id)?.status === "COMPLETE");
}

export function overallPercent(progress: Map<string, TopicProgress>): number {
  const all = [...progress.values()];
  if (all.length === 0) return 0;
  return Math.round((all.filter((p) => p.status === "COMPLETE").length / all.length) * 100);
}

export interface Route {
  id: string;
  name: string;
  components: string[];
}

/**
 * The components and topic sections a student studies. Subjects without routes
 * include everything; with routes, only the chosen papers and the sections they assess.
 */
export function routeScope<C extends { ref: string; section: string }>(
  route: Route | null,
  components: C[],
): { components: C[]; includesSection: (section: string) => boolean } {
  if (!route) return { components, includesSection: () => true };
  const chosen = components.filter((c) => route.components.includes(c.ref));
  // A component without a section (e.g. a Core or Extended tier paper) assesses every topic.
  if (chosen.some((c) => c.section === "")) return { components: chosen, includesSection: () => true };
  const sections = new Set(chosen.map((c) => c.section));
  return { components: chosen, includesSection: (section) => sections.has(section) };
}

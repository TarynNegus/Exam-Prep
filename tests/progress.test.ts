import { describe, expect, it } from "vitest";
import {
  computeTopicProgress,
  isTopicInPlan,
  overallPercent,
  paperUnlocked,
  unlockedTopicIds,
  FREE_TOPICS_PER_SECTION,
} from "@/lib/progress";

const topics = ["t1", "t2", "t3"];
const parts = [
  { id: "a", topicId: "t1", marks: 2 },
  { id: "b", topicId: "t1", marks: 2 },
  { id: "c", topicId: "t1", marks: 2 },
  { id: "d", topicId: "t1", marks: 2 },
  { id: "e", topicId: "t2", marks: 3 },
];

describe("computeTopicProgress", () => {
  it("is not started with no answers", () => {
    const p = computeTopicProgress(topics, parts, new Map());
    expect(p.get("t1")!.status).toBe("NOT_STARTED");
  });

  it("needs the minimum number of parts before completing", () => {
    const p = computeTopicProgress(topics, parts, new Map([["a", 2], ["b", 2]]));
    expect(p.get("t1")).toMatchObject({ attemptedParts: 2, scorePercent: 100, status: "IN_PROGRESS" });
  });

  it("completes once enough parts are answered at the pass mark", () => {
    const p = computeTopicProgress(topics, parts, new Map([["a", 2], ["b", 1], ["c", 1]]));
    expect(p.get("t1")).toMatchObject({ marksAwarded: 4, marksAttempted: 6, scorePercent: 67, status: "COMPLETE" });
  });

  it("stays in progress below the pass mark", () => {
    const p = computeTopicProgress(topics, parts, new Map([["a", 0], ["b", 1], ["c", 2]]));
    expect(p.get("t1")!.status).toBe("IN_PROGRESS");
  });

  it("completes small topics once every part is answered", () => {
    const p = computeTopicProgress(topics, parts, new Map([["e", 2]]));
    expect(p.get("t2")!.status).toBe("COMPLETE");
  });

  it("treats topics without questions as complete", () => {
    expect(computeTopicProgress(topics, parts, new Map()).get("t3")!.status).toBe("COMPLETE");
  });
});

describe("unlocking", () => {
  const ordered = topics.map((id) => ({ id, section: "" }));

  it("unlocks topics in order up to the first incomplete one", () => {
    const p = computeTopicProgress(topics, parts, new Map([["a", 2], ["b", 2], ["c", 2]]));
    expect([...unlockedTopicIds(ordered, p)]).toEqual(["t1", "t2"]);
  });

  it("unlocks each section independently", () => {
    const sectioned = [
      { id: "t1", section: "Pure" },
      { id: "t2", section: "Pure" },
      { id: "t3", section: "Statistics" },
    ];
    const p = computeTopicProgress(topics, parts, new Map());
    expect([...unlockedTopicIds(sectioned, p)]).toEqual(["t1", "t3"]);
  });

  it("unlocks a paper only when every topic it assesses is complete", () => {
    const partial = computeTopicProgress(topics, parts, new Map([["a", 2], ["b", 2], ["c", 2]]));
    expect(paperUnlocked(["t1"], partial)).toBe(true);
    expect(paperUnlocked(["t1", "t2"], partial)).toBe(false);
    const done = computeTopicProgress(topics, parts, new Map([["a", 2], ["b", 2], ["c", 2], ["e", 3]]));
    expect(paperUnlocked(["t1", "t2"], done)).toBe(true);
    expect(overallPercent(done)).toBe(100);
  });

  it("limits free users to the first topics of each section", () => {
    expect(isTopicInPlan(FREE_TOPICS_PER_SECTION - 1, false)).toBe(true);
    expect(isTopicInPlan(FREE_TOPICS_PER_SECTION, false)).toBe(false);
    expect(isTopicInPlan(10, true)).toBe(true);
  });
});

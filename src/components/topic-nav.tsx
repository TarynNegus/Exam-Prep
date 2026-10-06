import Link from "next/link";
import type { NeighbourTopic } from "@/lib/progress";

interface Props {
  subjectId: string;
  subjectLabel: string;
  previous: NeighbourTopic | null;
  next: NeighbourTopic | null;
}

function Neighbour({ topic, direction }: { topic: NeighbourTopic | null; direction: "previous" | "next" }) {
  const isNext = direction === "next";
  if (!topic) return <span className="hidden sm:block" />;
  const label = (
    <>
      <span className="block text-xs text-slate-500">{isNext ? "Next topic" : "Previous topic"}</span>
      <span className="block font-medium">
        {isNext ? "" : "← "}
        {topic.ref}. {topic.title}
        {isNext ? " →" : ""}
      </span>
    </>
  );
  const align = isNext ? "sm:text-right" : "sm:text-left";
  if (topic.open) {
    return (
      <Link href={`/practice/${topic.id}`} className={`btn-secondary block text-left ${align}`}>
        {label}
      </Link>
    );
  }
  return (
    <span
      aria-disabled="true"
      title={topic.reason ?? undefined}
      className={`block cursor-not-allowed rounded-lg border border-dashed border-slate-200 px-4 py-2 text-left text-slate-400 ${align}`}
    >
      {label}
      <span className="block text-xs">{topic.reason}</span>
    </span>
  );
}

/** Previous topic, back to the topic list, next topic: shown at the end of a practice set. */
export function TopicNav({ subjectId, subjectLabel, previous, next }: Props) {
  return (
    <nav aria-label="Topics" className="grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-3 sm:items-center">
      <Neighbour topic={previous} direction="previous" />
      <Link href={`/subjects/${subjectId}`} className="btn-secondary text-center">
        All {subjectLabel} topics
      </Link>
      <Neighbour topic={next} direction="next" />
    </nav>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Figures } from "@/components/figures";
import { PartPractice } from "@/components/part-practice";
import { TopicNav } from "@/components/topic-nav";
import { ProgressBar, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { publicPart } from "@/lib/feedback";
import { choosePracticeSet, newSetParam, parseSetParam, PRACTICE_SET_SIZE } from "@/lib/practice-set";
import { partSeed, resolvePart } from "@/lib/resolve-part";
import { requireUser } from "@/lib/session";
import { latestAwardedByPart, latestScoresBefore } from "@/lib/subject-progress";
import { keyboardFor } from "@/lib/keyboards";
import { accessibleTopic } from "@/lib/topic-access";
import { topicNeighbours } from "@/lib/progress";
import { randomSeed } from "@/lib/variants";

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ set?: string }>;
}) {
  const { topicId } = await params;
  const user = await requireUser();
  const access = await accessibleTopic(user, topicId);
  if (!access) {
    const topic = await db.topic.findUnique({ where: { id: topicId } });
    if (!topic) notFound();
    redirect(`/subjects/${topic.subjectId}`);
  }
  const { topic, view, subject, componentIds, topics } = access;
  const { previous, next } = topicNeighbours(topics, topic.id);

  // Each visit deals a new set; the set is kept in the URL so reloading
  // (for example after answering) shows the same questions.
  const set = parseSetParam((await searchParams).set);
  if (!set) redirect(`/practice/${topicId}?set=${newSetParam(randomSeed())}`);

  // Questions containing at least one part on this topic, showing only those parts.
  const pool = await db.question.findMany({
    where: { parts: { some: { topicId } }, paper: { componentId: { in: componentIds } } },
    include: {
      paper: { include: { component: true } },
      parts: { where: { topicId }, orderBy: { position: "asc" } },
    },
  });
  const poolParts = pool.flatMap((q) => q.parts);
  const scoresWhenDealt = await latestScoresBefore(user.id, poolParts, set.dealtAt);
  const questions = choosePracticeSet(
    pool.map((q) => ({ ...q, partIds: q.parts.map((p) => p.id) })),
    scoresWhenDealt,
    set.seed,
  );
  const latest = await latestAwardedByPart(
    user.id,
    poolParts.map((p) => p.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/subjects/${subject.id}`} className="text-sm text-brand-600 hover:underline">
          ← {subject.code} {subject.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">
            {topic.ref}. {topic.title}
          </h1>
          <StatusBadge status={view.progress.status} />
        </div>
        <p className="mt-1 text-slate-600">{topic.summary}</p>
        <div className="mt-4 max-w-md">
          <ProgressBar
            percent={Math.round((view.progress.attemptedParts / Math.max(1, view.progress.totalParts)) * 100)}
            label={`${view.progress.attemptedParts} of ${view.progress.totalParts} questions answered · score ${view.progress.scorePercent}%`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-50 px-4 py-3 text-sm">
        <p className="text-slate-700">
          {pool.length > PRACTICE_SET_SIZE
            ? `This set has ${questions.length} of the ${pool.length} questions for this topic, starting with ones you haven't tried or found hardest.`
            : `This set has all ${pool.length} questions for this topic.`}{" "}
          Numbers and answer options change each time.
        </p>
        <Link href={`/practice/${topicId}?set=${newSetParam(randomSeed())}`} className="btn-secondary">
          New set
        </Link>
      </div>

      {questions.map((question) => (
        <article key={question.id} className="card space-y-4">
          <div className="text-xs font-medium text-slate-500">
            {question.paper.title} · {question.paper.component.title} · Question {question.number}
          </div>
          {question.stem && <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3">{question.stem}</p>}
          <Figures figures={question.figures} />
          {question.parts.map((part) => {
            const seed = partSeed(set.seed, part.id);
            // Keyed by seed too, so a new set replaces the state of the previous one.
            return (
              <PartPractice
                key={`${part.id}-${seed}`}
                part={publicPart(resolvePart(part, seed))}
                lastScore={latest.get(part.id) ?? null}
                keyboard={keyboardFor(subject)}
              />
            );
          })}
        </article>
      ))}

      <TopicNav subjectId={subject.id} subjectLabel={`${subject.code} ${subject.name}`} previous={previous} next={next} />
    </div>
  );
}

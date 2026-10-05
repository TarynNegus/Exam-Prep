import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PartPractice } from "@/components/part-practice";
import { ProgressBar, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { publicPart } from "@/lib/feedback";
import { requireUser } from "@/lib/session";
import { latestAwardedByPart } from "@/lib/subject-progress";
import { accessibleTopic } from "@/lib/topic-access";

export default async function PracticePage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const user = await requireUser();
  const access = await accessibleTopic(user, topicId);
  if (!access) {
    const topic = await db.topic.findUnique({ where: { id: topicId } });
    if (!topic) notFound();
    redirect(`/subjects/${topic.subjectId}`);
  }
  const { topic, view, subject, componentIds } = access;

  // Questions containing at least one part on this topic, showing only those parts.
  const questions = await db.question.findMany({
    where: { parts: { some: { topicId } }, paper: { componentId: { in: componentIds } } },
    orderBy: [{ paper: { series: "asc" } }, { paper: { variant: "asc" } }, { number: "asc" }],
    include: {
      paper: { include: { component: true } },
      parts: { where: { topicId }, orderBy: { position: "asc" } },
    },
  });
  const latest = await latestAwardedByPart(
    user.id,
    questions.flatMap((q) => q.parts.map((p) => p.id)),
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

      {questions.map((question) => (
        <article key={question.id} className="card space-y-4">
          <div className="text-xs font-medium text-slate-500">
            {question.paper.title} · {question.paper.component.title} · Question {question.number}
          </div>
          {question.stem && <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3">{question.stem}</p>}
          {question.parts.map((part) => (
            <PartPractice key={part.id} part={publicPart(part)} lastScore={latest.get(part.id) ?? null} />
          ))}
        </article>
      ))}
    </div>
  );
}

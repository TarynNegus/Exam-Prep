import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, ProgressBar, QUALIFICATION_LABEL, StatusBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { enrol, unenrol } from "@/lib/enrol-actions";
import { FREE_TOPICS_PER_SUBJECT, TOPIC_MIN_PARTS, TOPIC_PASS_PERCENT } from "@/lib/progress";
import { requireUser } from "@/lib/session";
import { loadSubjectProgress } from "@/lib/subject-progress";

export default async function SubjectPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  const user = await requireUser();
  const data = await loadSubjectProgress(subjectId, user);
  if (!data) notFound();
  const { subject, topics, subscribed, overallPercent, papersUnlocked } = data;
  const enrolled = await db.enrolment.findUnique({
    where: { userId_subjectId: { userId: user.id, subjectId } },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500">
            {QUALIFICATION_LABEL[subject.qualification]} · {subject.code} · Syllabus {subject.syllabusYears}
          </div>
          <h1 className="text-3xl font-bold">{subject.name}</h1>
          {subject.description && <p className="mt-2 max-w-3xl text-sm text-slate-600">{subject.description}</p>}
        </div>
        <form action={(enrolled ? unenrol : enrol).bind(null, subject.id)}>
          <button className="btn-secondary">{enrolled ? "Remove from my subjects" : "Add to my subjects"}</button>
        </form>
      </div>

      <div className="card">
        <ProgressBar percent={overallPercent} label="Syllabus topics complete" />
        <p className="mt-3 text-xs text-slate-500">
          A topic is complete when you have answered at least {TOPIC_MIN_PARTS} of its questions with an overall score of{" "}
          {TOPIC_PASS_PERCENT}% or more. Completing a topic unlocks the next one.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Syllabus topics</h2>
        <ol className="space-y-3">
          {topics.map((topic) => {
            const available = topic.unlocked && topic.inPlan && topic.progress.totalParts > 0;
            return (
              <li key={topic.id} className={`card flex flex-wrap items-center gap-4 ${available ? "" : "opacity-70"}`}>
                <div className="w-10 shrink-0 text-center text-lg font-bold text-brand-600">{topic.ref}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{topic.title}</h3>
                    {topic.progress.totalParts > 0 && <StatusBadge status={topic.progress.status} />}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{topic.summary}</p>
                  {topic.progress.attemptedParts > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      {topic.progress.attemptedParts}/{topic.progress.totalParts} questions answered · score{" "}
                      {topic.progress.scorePercent}%
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {topic.progress.totalParts === 0 ? (
                    <Badge>Questions coming soon</Badge>
                  ) : !topic.inPlan ? (
                    <Link href="/billing" className="btn-secondary">Upgrade to unlock</Link>
                  ) : !topic.unlocked ? (
                    <Badge>Complete the previous topic first</Badge>
                  ) : (
                    <Link href={`/practice/${topic.id}`} className="btn-primary">
                      {topic.progress.status === "NOT_STARTED" ? "Start" : topic.progress.status === "COMPLETE" ? "Review" : "Continue"}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {!subscribed && (
          <p className="mt-3 text-sm text-slate-500">
            The free plan includes the first {FREE_TOPICS_PER_SUBJECT} topics of each subject.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold">Full past papers</h2>
        <p className="mb-4 text-sm text-slate-600">
          {papersUnlocked
            ? "You've completed every topic. Sit a full paper under timed conditions."
            : subscribed
              ? "Complete every syllabus topic to unlock full timed past papers."
              : "Full past papers are part of the subscription and unlock once every topic is complete."}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {subject.components.map((component) => (
            <div key={component.id} className="card">
              <h3 className="font-semibold">{component.title}</h3>
              <p className="text-xs text-slate-500">
                {component.durationMin} minutes · {component.totalMarks} marks
              </p>
              <ul className="mt-3 space-y-2">
                {component.papers.length === 0 && <li className="text-sm text-slate-500">No papers yet.</li>}
                {component.papers.map((paper) => (
                  <li key={paper.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{paper.title}</span>
                    {papersUnlocked ? (
                      <Link href={`/papers/${paper.id}`} className="btn-secondary">Open</Link>
                    ) : (
                      <Badge>Locked</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

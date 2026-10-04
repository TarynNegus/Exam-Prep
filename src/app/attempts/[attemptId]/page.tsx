import Link from "next/link";
import { notFound } from "next/navigation";
import { ExamPaper } from "@/components/exam-paper";
import { ResultPart } from "@/components/result-part";
import { ProgressBar } from "@/components/ui";
import { db } from "@/lib/db";
import { partFeedback, publicPart } from "@/lib/feedback";
import { requireUser } from "@/lib/session";

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser();
  const attempt = await db.paperAttempt.findUnique({
    where: { id: attemptId },
    include: {
      paper: {
        include: {
          component: { include: { subject: true } },
          questions: {
            orderBy: { number: "asc" },
            include: { parts: { orderBy: { position: "asc" }, include: { topic: true } } },
          },
        },
      },
      answers: true,
    },
  });
  if (!attempt || attempt.userId !== user.id) notFound();
  const { paper } = attempt;

  if (!attempt.submittedAt) {
    return (
      <ExamPaper
        attemptId={attempt.id}
        title={paper.title}
        deadline={attempt.startedAt.getTime() + paper.component.durationMin * 60_000}
        questions={paper.questions.map((q) => ({
          id: q.id,
          number: q.number,
          stem: q.stem,
          parts: q.parts.map(publicPart),
        }))}
      />
    );
  }

  const answerByPart = new Map(attempt.answers.map((a) => [a.partId, a]));
  const parts = paper.questions.flatMap((q) => q.parts);
  const totalMarks = parts.reduce((sum, p) => sum + p.marks, 0);
  const awarded = attempt.answers.reduce((sum, a) => sum + a.awardedMarks, 0);
  const pending = attempt.answers.filter((a) => a.pendingReview).length;

  // Score per syllabus topic, to show where to focus revision.
  const byTopic = new Map<string, { title: string; ref: string; marks: number; awarded: number }>();
  for (const part of parts) {
    const entry = byTopic.get(part.topicId) ?? { title: part.topic.title, ref: part.topic.ref, marks: 0, awarded: 0 };
    entry.marks += part.marks;
    entry.awarded += answerByPart.get(part.id)?.awardedMarks ?? 0;
    byTopic.set(part.topicId, entry);
  }

  return (
    <div className="space-y-6">
      <Link href={`/subjects/${paper.component.subjectId}`} className="text-sm text-brand-600 hover:underline">
        ← {paper.component.subject.code} {paper.component.subject.name}
      </Link>
      <div className="card space-y-3">
        <h1 className="text-2xl font-bold">{paper.title} — results</h1>
        <p className="text-4xl font-extrabold text-brand-700">
          {awarded}/{totalMarks}{" "}
          <span className="text-lg font-medium text-slate-500">({Math.round((awarded / Math.max(1, totalMarks)) * 100)}%)</span>
        </p>
        {pending > 0 && (
          <p className="text-sm text-amber-700">
            {pending} written answer{pending === 1 ? "" : "s"} still need self-marking. Your score will update as you mark
            them below.
          </p>
        )}
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">Score by syllabus topic</h2>
        <div className="space-y-3">
          {[...byTopic.values()].map((t) => (
            <ProgressBar key={t.ref} percent={Math.round((t.awarded / t.marks) * 100)} label={`${t.ref}. ${t.title} — ${t.awarded}/${t.marks}`} />
          ))}
        </div>
      </section>

      {paper.questions.map((question) => (
        <article key={question.id} className="card space-y-4">
          <h2 className="font-semibold">Question {question.number}</h2>
          {question.stem && <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3">{question.stem}</p>}
          {question.parts.map((part) => {
            const answer = answerByPart.get(part.id);
            return (
              <div key={part.id} className="border-t border-slate-100 pt-4 first:border-0">
                <div className="flex items-start justify-between gap-4">
                  <p className="whitespace-pre-line">
                    {part.label && <span className="mr-2 font-semibold">{part.label}</span>}
                    {part.prompt}
                  </p>
                  <span className="shrink-0 text-sm text-slate-500">[{part.marks}]</span>
                </div>
                <div className="mt-2 rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="text-xs font-medium text-slate-500">Your answer</div>
                  <p className="whitespace-pre-line">{answer?.response || <em className="text-slate-400">No answer</em>}</p>
                </div>
                {answer && (
                  <ResultPart
                    answerId={answer.id}
                    feedback={partFeedback(part)}
                    marks={part.marks}
                    awardedMarks={answer.awardedMarks}
                    pendingReview={answer.pendingReview}
                    selfMarked={answer.selfMarked}
                  />
                )}
              </div>
            );
          })}
        </article>
      ))}
    </div>
  );
}

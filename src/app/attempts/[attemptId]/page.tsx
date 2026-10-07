import Link from "next/link";
import { notFound } from "next/navigation";
import { ExamPaper } from "@/components/exam-paper";
import { Figures, type FigureData } from "@/components/figures";
import { ResultPart } from "@/components/result-part";
import { ProgressBar } from "@/components/ui";
import { loadAttemptContent } from "@/lib/attempts";
import { keyboardFor } from "@/lib/keyboards";
import { db } from "@/lib/db";
import { partFeedback, publicPart } from "@/lib/feedback";
import { partSeed, resolvePart } from "@/lib/resolve-part";
import { requireUser } from "@/lib/session";

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser();
  const attempt = await db.paperAttempt.findUnique({ where: { id: attemptId }, include: { answers: true } });
  if (!attempt || attempt.userId !== user.id) notFound();
  const { title, component, durationMin, questions } = await loadAttemptContent(attempt);
  // Practice tests are numbered 1, 2, 3… in the order drawn; past papers keep their numbering.
  const questionNumber = (index: number, number: number) => (attempt.paperId ? number : index + 1);

  if (!attempt.submittedAt) {
    return (
      <ExamPaper
        key={attempt.id}
        attemptId={attempt.id}
        title={title}
        deadline={attempt.startedAt.getTime() + durationMin * 60_000}
        keyboard={keyboardFor(component.subject)}
        questions={questions.map((q, index) => ({
          id: q.id,
          number: questionNumber(index, q.number),
          stem: q.stem,
          figures: q.figures as unknown as FigureData[],
          parts: q.parts.map((p) => publicPart(resolvePart(p, partSeed(attempt.seed, p.id)))),
        }))}
      />
    );
  }

  const answerByPart = new Map(attempt.answers.map((a) => [a.partId, a]));
  const parts = questions.flatMap((q) => q.parts);
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
      <Link href={`/subjects/${component.subjectId}`} className="text-sm text-brand-600 hover:underline">
        ← {component.subject.code} {component.subject.name}
      </Link>
      <div className="card space-y-3">
        <h1 className="text-2xl font-bold">{title} — results</h1>
        <p className="text-4xl font-extrabold text-brand-700">
          {awarded}/{totalMarks}{" "}
          <span className="text-lg font-medium text-slate-500">
            ({Math.round((awarded / Math.max(1, totalMarks)) * 100)}%)
          </span>
        </p>
        {pending > 0 && (
          <p className="text-sm text-amber-700">
            {pending} written answer{pending === 1 ? "" : "s"} still need self-marking. Your score will update as you
            mark them below.
          </p>
        )}
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">Score by syllabus topic</h2>
        <div className="space-y-3">
          {[...byTopic.values()].map((t) => (
            <ProgressBar
              key={t.ref}
              percent={Math.round((t.awarded / t.marks) * 100)}
              label={`${t.ref}. ${t.title} — ${t.awarded}/${t.marks}`}
            />
          ))}
        </div>
      </section>

      {questions.map((question, index) => (
        <article key={question.id} className="card space-y-4">
          <h2 className="font-semibold">Question {questionNumber(index, question.number)}</h2>
          {question.stem && <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3">{question.stem}</p>}
          <Figures figures={question.figures} />
          {question.parts.map((stored) => {
            const answer = answerByPart.get(stored.id);
            // Show the version the student answered, with the letters they saw.
            const part = resolvePart(stored, answer?.variantSeed ?? partSeed(attempt.seed, stored.id));
            const shownOption = part.options?.find((o) => o.key === answer?.response);
            const response = shownOption ? `${shownOption.displayKey} – ${shownOption.text}` : answer?.response;
            return (
              <div key={part.id} className="border-t border-slate-100 pt-4 first:border-0">
                <div className="flex items-start justify-between gap-4">
                  <p className="whitespace-pre-line">
                    {part.label && <span className="mr-2 font-semibold">{part.label}</span>}
                    {part.prompt}
                  </p>
                  <span className="shrink-0 text-sm text-slate-500">[{part.marks}]</span>
                </div>
                <Figures figures={part.figures} />
                <div className="mt-2 rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="text-xs font-medium text-slate-500">Your answer</div>
                  <p className="whitespace-pre-line">{response || <em className="text-slate-400">No answer</em>}</p>
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

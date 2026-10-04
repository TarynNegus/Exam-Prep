import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { startPaper } from "@/lib/paper-actions";
import { canSitPaper } from "@/lib/topic-access";
import { requireUser } from "@/lib/session";

export default async function PaperPage({ params }: { params: Promise<{ paperId: string }> }) {
  const { paperId } = await params;
  const user = await requireUser();
  const paper = await db.pastPaper.findUnique({
    where: { id: paperId },
    include: {
      component: { include: { subject: true } },
      questions: { include: { parts: { select: { marks: true } } } },
      attempts: { where: { userId: user.id }, orderBy: { startedAt: "desc" } },
    },
  });
  if (!paper) notFound();
  const allowed = await canSitPaper(user, paperId);
  const totalMarks = paper.questions.flatMap((q) => q.parts).reduce((sum, p) => sum + p.marks, 0);
  const { component } = paper;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`/subjects/${component.subjectId}`} className="text-sm text-brand-600 hover:underline">
        ← {component.subject.code} {component.subject.name}
      </Link>
      <div className="card space-y-3">
        <h1 className="text-2xl font-bold">{paper.title}</h1>
        <p className="text-slate-600">{component.title}</p>
        <ul className="list-inside list-disc text-sm text-slate-700">
          <li>Time allowed: {component.durationMin} minutes</li>
          <li>{paper.questions.length} questions, {totalMarks} marks</li>
          <li>Answer all questions. Your paper is submitted automatically when time runs out.</li>
          <li>Written answers are self-marked against the mark scheme after you submit.</li>
        </ul>
        {allowed ? (
          <form action={startPaper.bind(null, paper.id)}>
            <button className="btn-primary">Start paper</button>
          </form>
        ) : (
          <p className="text-sm text-amber-700">Complete every syllabus topic with a subscription to sit this paper.</p>
        )}
      </div>

      {paper.attempts.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-semibold">Your attempts</h2>
          <ul className="space-y-1 text-sm">
            {paper.attempts.map((a) => (
              <li key={a.id}>
                <Link href={`/attempts/${a.id}`} className="text-brand-600 hover:underline">
                  {a.startedAt.toLocaleString("en-GB")} — {a.submittedAt ? "view results" : "in progress"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

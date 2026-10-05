import Link from "next/link";
import { ProgressBar, QUALIFICATION_LABEL } from "@/components/ui";
import { hasSubscription } from "@/lib/access";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { loadSubjectProgress } from "@/lib/subject-progress";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const enrolments = await db.enrolment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  const subjects = (await Promise.all(enrolments.map((e) => loadSubjectProgress(e.subjectId, user)))).filter(
    (s) => s !== null,
  );
  const recentAttempts = await db.paperAttempt.findMany({
    where: { userId: user.id, submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
    take: 5,
    include: {
      paper: { include: { component: { include: { subject: true } } } },
      component: { include: { subject: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user.name.split(" ")[0]}</h1>
        {!hasSubscription(user) && (
          <p className="mt-2 text-sm text-slate-600">
            You are on the free plan.{" "}
            <Link href="/billing" className="text-brand-600 underline">
              Upgrade
            </Link>{" "}
            to unlock every topic and full past papers.
          </p>
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="card text-center">
          <p className="text-slate-600">You haven&apos;t added any subjects yet.</p>
          <Link href="/subjects" className="btn-primary mt-4">
            Choose your subjects
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {subjects.map(({ subject, topics, overallPercent }) => {
            const next = topics.find((t) => t.unlocked && t.inPlan && t.progress.status !== "COMPLETE");
            return (
              <Link key={subject.id} href={`/subjects/${subject.id}`} className="card block hover:border-brand-600">
                <div className="text-xs font-medium text-slate-500">
                  {QUALIFICATION_LABEL[subject.qualification]} · {subject.code}
                </div>
                <h2 className="mb-3 text-lg font-semibold">{subject.name}</h2>
                <ProgressBar percent={overallPercent} label="Syllabus complete" />
                <p className="mt-3 text-sm text-slate-600">
                  {next ? (
                    <>
                      Next up: <span className="font-medium">{next.title}</span>
                    </>
                  ) : (
                    "All available topics complete"
                  )}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {recentAttempts.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Recent papers and tests</h2>
          <ul className="card divide-y divide-slate-100 p-0">
            {recentAttempts.map((attempt) => (
              <li key={attempt.id}>
                <Link
                  href={`/attempts/${attempt.id}`}
                  className="flex justify-between px-5 py-3 text-sm hover:bg-slate-50"
                >
                  <span>
                    {(() => {
                      const component = attempt.paper?.component ?? attempt.component!;
                      const title = attempt.paper?.title ?? `${component.title} – practice test`;
                      return `${component.subject.code} ${component.subject.name} — ${title}`;
                    })()}
                  </span>
                  <span className="text-slate-500">{attempt.submittedAt!.toLocaleDateString("en-GB")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

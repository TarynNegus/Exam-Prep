import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, ProgressBar, QUALIFICATION_LABEL, StatusBadge } from "@/components/ui";
import { chooseRoute, enrol, unenrol } from "@/lib/enrol-actions";
import { FREE_TOPICS_PER_SECTION, TOPIC_MIN_PARTS, TOPIC_PASS_PERCENT } from "@/lib/progress";
import { requireUser } from "@/lib/session";
import { loadSubjectProgress } from "@/lib/subject-progress";

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ change?: string }>;
}) {
  const { subjectId } = await params;
  const { change } = await searchParams;
  const user = await requireUser();
  const data = await loadSubjectProgress(subjectId, user);
  if (!data) notFound();
  const {
    subject,
    topics,
    subscribed,
    overallPercent,
    unlockedPapers,
    routes,
    route,
    needsRoute,
    components,
    enrolled,
  } = data;
  // Group topics by section, keeping syllabus order.
  const sections = [...new Set(topics.map((t) => t.section))].map((name) => ({
    name,
    topics: topics.filter((t) => t.section === name),
  }));
  const header = (
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
  );

  if (needsRoute || (change && routes.length > 0)) {
    return (
      <div className="space-y-8">
        {header}
        <form action={chooseRoute.bind(null, subject.id)} className="card max-w-2xl space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Which papers are you taking?</h2>
            <p className="mt-1 text-sm text-slate-600">
              You&apos;ll only see the topics and past papers for your combination. You can change this later.
            </p>
          </div>
          <fieldset className="space-y-2">
            <legend className="sr-only">Combination of papers</legend>
            {routes.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
              >
                <input
                  type="radio"
                  name="routeId"
                  value={r.id}
                  defaultChecked={r.id === route?.id}
                  required
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{r.name}</span>
                  <span className="block text-slate-500">
                    {subject.components
                      .filter((c) => r.components.includes(c.ref))
                      .map((c) => c.title)
                      .join(" · ")}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="flex gap-3">
            <button className="btn-primary">Save</button>
            {route && (
              <Link href={`/subjects/${subject.id}`} className="btn-secondary">
                Cancel
              </Link>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}

      {route && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-slate-600">
            Your papers: <span className="font-medium text-slate-900">{route.name}</span>
          </span>
          <Link href={`/subjects/${subject.id}?change=1`} className="text-brand-600 underline">
            Change
          </Link>
        </div>
      )}

      <div className="card">
        <ProgressBar percent={overallPercent} label="Syllabus topics complete" />
        <p className="mt-3 text-xs text-slate-500">
          A topic is complete when you have answered at least {TOPIC_MIN_PARTS} of its questions with an overall score
          of {TOPIC_PASS_PERCENT}% or more. Completing a topic unlocks the next one
          {sections.length > 1 ? " in the same section" : ""}.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Syllabus topics</h2>
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.name}>
              {section.name && (
                <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">{section.name}</h3>
              )}
              <ol className="space-y-3">
                {section.topics.map((topic) => {
                  const available = topic.unlocked && topic.inPlan && topic.progress.totalParts > 0;
                  return (
                    <li
                      key={topic.id}
                      className={`card flex flex-wrap items-center gap-4 ${available ? "" : "opacity-70"}`}
                    >
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
                          <Link href="/billing" className="btn-secondary">
                            Upgrade to unlock
                          </Link>
                        ) : !topic.unlocked ? (
                          <Badge>Complete the previous topic first</Badge>
                        ) : (
                          <Link href={`/practice/${topic.id}`} className="btn-primary">
                            {topic.progress.status === "NOT_STARTED"
                              ? "Start"
                              : topic.progress.status === "COMPLETE"
                                ? "Review"
                                : "Continue"}
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
        {!subscribed && (
          <p className="mt-3 text-sm text-slate-500">
            The free plan includes the first {FREE_TOPICS_PER_SECTION} topics of each{" "}
            {sections.length > 1 ? "section" : "subject"}.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold">Full past papers</h2>
        <p className="mb-4 text-sm text-slate-600">
          {subscribed
            ? "Each paper unlocks once you have completed every topic it covers. Sit it under timed conditions."
            : "Full past papers are part of the subscription. Each one unlocks once you have completed the topics it covers."}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {components.map((component) => (
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
                    {unlockedPapers.has(paper.id) ? (
                      <Link href={`/papers/${paper.id}`} className="btn-secondary">
                        Open
                      </Link>
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

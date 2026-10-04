import Link from "next/link";
import { QUALIFICATION_LABEL } from "@/components/ui";
import { db } from "@/lib/db";
import { enrol } from "@/lib/enrol-actions";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const user = await requireUser();
  const [subjects, enrolments] = await Promise.all([
    db.subject.findMany({
      orderBy: [{ qualification: "asc" }, { name: "asc" }],
      include: { _count: { select: { topics: true, components: true } } },
    }),
    db.enrolment.findMany({ where: { userId: user.id }, select: { subjectId: true } }),
  ]);
  const enrolled = new Set(enrolments.map((e) => e.subjectId));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Subjects</h1>
        <p className="mt-1 text-slate-600">Choose the subjects you are taking. You can study as many as you like.</p>
      </div>
      {(["IGCSE", "AS_A_LEVEL"] as const).map((qualification) => {
        const group = subjects.filter((s) => s.qualification === qualification);
        if (group.length === 0) return null;
        return (
          <section key={qualification}>
            <h2 className="mb-4 text-xl font-semibold">{QUALIFICATION_LABEL[qualification]}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((subject) => (
                <div key={subject.id} className="card flex flex-col">
                  <div className="text-xs font-medium text-slate-500">
                    {subject.code} · Syllabus {subject.syllabusYears}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold">{subject.name}</h3>
                  <p className="mt-2 flex-1 text-sm text-slate-600">
                    {subject._count.topics} syllabus topics · {subject._count.components} components
                  </p>
                  <div className="mt-4">
                    {enrolled.has(subject.id) ? (
                      <Link href={`/subjects/${subject.id}`} className="btn-secondary w-full">Continue</Link>
                    ) : (
                      <form action={enrol.bind(null, subject.id)}>
                        <button className="btn-primary w-full">Add subject</button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

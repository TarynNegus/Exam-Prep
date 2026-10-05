import type { PrismaClient } from "@prisma/client";
import { contentFileSchema } from "./content-schema";

/** JSON with object keys sorted, so values read back from jsonb columns compare equal. */
function canonical(value: unknown): string {
  return JSON.stringify(value ?? null, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v,
  );
}

/** True when every field in `wanted` already has that value in `stored`. */
function unchanged(stored: Record<string, unknown>, wanted: Record<string, unknown>): boolean {
  return Object.keys(wanted).every((key) => canonical(stored[key]) === canonical(wanted[key]));
}

/**
 * Validates a content file and upserts it into the database. Re-importing the
 * same file updates content in place, so students' answers are preserved.
 * Papers, questions and parts that are already up to date are skipped, so a
 * re-import over a remote connection only pays for what changed.
 */
export async function importContent(db: PrismaClient, raw: unknown) {
  const content = contentFileSchema.parse(raw);
  const { subject: s } = content;

  return db.$transaction(
    async (tx) => {
      const subject = await tx.subject.upsert({
        where: { code_syllabusYears: { code: s.code, syllabusYears: s.syllabusYears } },
        update: { name: s.name, qualification: s.qualification, description: s.description, routes: content.routes },
        create: { ...s, routes: content.routes },
      });

      const topicIds = new Map<string, string>();
      for (const [position, t] of content.topics.entries()) {
        const topic = await tx.topic.upsert({
          where: { subjectId_ref: { subjectId: subject.id, ref: t.ref } },
          update: { title: t.title, summary: t.summary, section: t.section, position },
          create: { ...t, position, subjectId: subject.id },
        });
        topicIds.set(t.ref, topic.id);
      }

      const componentIds = new Map<string, string>();
      for (const c of content.components) {
        const component = await tx.component.upsert({
          where: { subjectId_ref: { subjectId: subject.id, ref: c.ref } },
          update: { title: c.title, durationMin: c.durationMin, totalMarks: c.totalMarks, section: c.section },
          create: { ...c, subjectId: subject.id },
        });
        componentIds.set(c.ref, component.id);
      }

      // Everything already stored for this subject's papers, read in one query.
      const existingPapers = await tx.pastPaper.findMany({
        where: { componentId: { in: [...componentIds.values()] } },
        include: { questions: { include: { parts: true } } },
      });
      const storedPaper = new Map(existingPapers.map((p) => [`${p.componentId}|${p.series}|${p.variant}`, p]));

      let partCount = 0;
      for (const p of content.papers) {
        const componentId = componentIds.get(p.component)!;
        const paperData = { title: p.title, questionBank: p.questionBank };
        const existingPaper = storedPaper.get(`${componentId}|${p.series}|${p.variant}`);
        const paper =
          existingPaper && unchanged(existingPaper, paperData)
            ? existingPaper
            : await tx.pastPaper.upsert({
                where: { componentId_series_variant: { componentId, series: p.series, variant: p.variant } },
                update: paperData,
                create: { componentId, series: p.series, variant: p.variant, ...paperData },
              });
        const storedQuestion = new Map((existingPaper?.questions ?? []).map((q) => [q.number, q]));
        for (const q of p.questions) {
          const questionData = { stem: q.stem, figures: q.figures };
          const existingQuestion = storedQuestion.get(q.number);
          const question =
            existingQuestion && unchanged(existingQuestion, questionData)
              ? existingQuestion
              : await tx.question.upsert({
                  where: { paperId_number: { paperId: paper.id, number: q.number } },
                  update: questionData,
                  create: { paperId: paper.id, number: q.number, ...questionData },
                });
          const storedPart = new Map((existingQuestion?.parts ?? []).map((part) => [part.position, part]));
          for (const [position, part] of q.parts.entries()) {
            const data = {
              topicId: topicIds.get(part.topic)!,
              label: part.label,
              prompt: part.prompt,
              marks: part.marks,
              answerType: part.answerType,
              options: part.options ?? undefined,
              correctAnswer: part.correctAnswer ?? null,
              tolerance: part.tolerance ?? null,
              acceptedAnswers: part.acceptedAnswers ?? [],
              markingPoints: part.markingPoints,
              examinerComment: part.examinerComment,
              figures: part.figures,
              variables: part.variables,
              answerExpression: part.answerExpression ?? null,
              relativeTolerance: part.relativeTolerance ?? null,
            };
            partCount += 1;
            const existingPart = storedPart.get(position);
            if (existingPart && unchanged(existingPart, data)) continue;
            await tx.questionPart.upsert({
              where: { questionId_position: { questionId: question.id, position } },
              update: data,
              create: { ...data, questionId: question.id, position },
            });
          }
        }
      }

      return { subject: `${s.code} ${s.name} (${s.syllabusYears})`, topics: content.topics.length, parts: partCount };
    },
    // Each part is a separate round trip, so a large subject over a remote
    // connection pooler can take a few minutes.
    { timeout: 600_000, maxWait: 60_000 },
  );
}

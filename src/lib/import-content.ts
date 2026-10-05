import type { PrismaClient } from "@prisma/client";
import { contentFileSchema } from "./content-schema";

/**
 * Validates a content file and upserts it into the database. Re-importing the
 * same file updates content in place, so students' answers are preserved.
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

      let partCount = 0;
      for (const p of content.papers) {
        const componentId = componentIds.get(p.component)!;
        const paper = await tx.pastPaper.upsert({
          where: { componentId_series_variant: { componentId, series: p.series, variant: p.variant } },
          update: { title: p.title, questionBank: p.questionBank },
          create: { componentId, series: p.series, variant: p.variant, title: p.title, questionBank: p.questionBank },
        });
        for (const q of p.questions) {
          const question = await tx.question.upsert({
            where: { paperId_number: { paperId: paper.id, number: q.number } },
            update: { stem: q.stem, figures: q.figures },
            create: { paperId: paper.id, number: q.number, stem: q.stem, figures: q.figures },
          });
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
            await tx.questionPart.upsert({
              where: { questionId_position: { questionId: question.id, position } },
              update: data,
              create: { ...data, questionId: question.id, position },
            });
            partCount += 1;
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

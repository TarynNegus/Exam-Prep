import { z } from "zod";

// Format of the JSON content files in /content. One file per subject syllabus.

const markingPoint = z.object({ text: z.string().min(1), marks: z.number().int().min(0) });

const part = z
  .object({
    label: z.string().default(""),
    topic: z.string().min(1).describe("Topic ref this part assesses"),
    prompt: z.string().min(1),
    marks: z.number().int().positive(),
    answerType: z.enum(["MULTIPLE_CHOICE", "NUMERIC", "SHORT_TEXT", "EXTENDED"]),
    options: z.array(z.object({ key: z.string().min(1), text: z.string().min(1) })).optional(),
    correctAnswer: z.string().optional(),
    tolerance: z.number().min(0).optional(),
    acceptedAnswers: z.array(z.string()).optional(),
    markingPoints: z.array(markingPoint).min(1),
    examinerComment: z.string().default(""),
  })
  .superRefine((p, ctx) => {
    if (p.answerType === "MULTIPLE_CHOICE") {
      if (!p.options?.length) ctx.addIssue({ code: "custom", message: `${p.label}: multiple choice needs options` });
      if (!p.options?.some((o) => o.key === p.correctAnswer))
        ctx.addIssue({ code: "custom", message: `${p.label}: correctAnswer must be one of the option keys` });
    }
    if (p.answerType === "NUMERIC" && (p.correctAnswer === undefined || Number.isNaN(Number(p.correctAnswer))))
      ctx.addIssue({ code: "custom", message: `${p.label}: numeric parts need a numeric correctAnswer` });
    if (p.answerType === "SHORT_TEXT" && !p.acceptedAnswers?.length)
      ctx.addIssue({ code: "custom", message: `${p.label}: short text parts need acceptedAnswers` });
  });

const question = z.object({
  number: z.number().int().positive(),
  stem: z.string().default(""),
  parts: z.array(part).min(1),
});

const paper = z.object({
  component: z.string().min(1),
  series: z.string().min(1),
  variant: z.string().min(1),
  title: z.string().min(1),
  questions: z.array(question).min(1),
});

export const contentFileSchema = z
  .object({
    subject: z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      qualification: z.enum(["IGCSE", "AS_A_LEVEL"]),
      syllabusYears: z.string().min(1),
      description: z.string().default(""),
    }),
    topics: z.array(z.object({ ref: z.string().min(1), title: z.string().min(1), summary: z.string().default("") })).min(1),
    components: z.array(
      z.object({
        ref: z.string().min(1),
        title: z.string().min(1),
        durationMin: z.number().int().positive(),
        totalMarks: z.number().int().positive(),
      }),
    ),
    papers: z.array(paper).default([]),
  })
  .superRefine((file, ctx) => {
    const topicRefs = new Set(file.topics.map((t) => t.ref));
    const componentRefs = new Set(file.components.map((c) => c.ref));
    for (const p of file.papers) {
      if (!componentRefs.has(p.component))
        ctx.addIssue({ code: "custom", message: `${p.title}: unknown component "${p.component}"` });
      for (const q of p.questions)
        for (const part of q.parts)
          if (!topicRefs.has(part.topic))
            ctx.addIssue({ code: "custom", message: `${p.title} Q${q.number}${part.label}: unknown topic "${part.topic}"` });
    }
  });

export type ContentFile = z.infer<typeof contentFileSchema>;

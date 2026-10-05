import { z } from "zod";

// Format of the JSON content files in /content. One file per subject syllabus.

const markingPoint = z.object({ text: z.string().min(1), marks: z.number().int().min(0) });

/** An image shown with a question or part. Files live in public/figures/. */
export const figureSchema = z.object({
  src: z
    .string()
    .regex(/^[\w-]+(\/[\w.-]+)*\.(svg|png|jpe?g|webp)$/, "figure src must be a path like 0625/circuit-1.svg")
    .describe("Path inside public/figures/"),
  alt: z.string().min(1).describe("Text description for screen readers"),
  caption: z.string().default("").describe('e.g. "Fig. 1.1"'),
});


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
    figures: z.array(figureSchema).default([]),
    // Number variants: {name} and {=expression} placeholders in the prompt,
    // options and mark scheme take values from these variables.
    variables: z
      .record(
        z.string().regex(/^[A-Za-z_]\w*$/),
        z.object({ min: z.number(), max: z.number(), step: z.number().positive().optional(), value: z.number() }),
      )
      .default({}),
    answerExpression: z.string().optional().describe("NUMERIC answer in terms of the variables, e.g. 2*pi*r"),
    relativeTolerance: z.number().min(0).optional().describe("Tolerance as a fraction of the answer"),
  })
  .superRefine((p, ctx) => {
    for (const [name, v] of Object.entries(p.variables)) {
      const steps = (v.value - v.min) / (v.step ?? 1);
      if (v.min > v.max || v.value < v.min || v.value > v.max || Math.abs(steps - Math.round(steps)) > 1e-9)
        ctx.addIssue({ code: "custom", message: `${p.label}: variable "${name}" needs min ≤ value ≤ max on its step` });
    }
    if (p.answerExpression && p.answerType !== "NUMERIC")
      ctx.addIssue({ code: "custom", message: `${p.label}: answerExpression is only for NUMERIC parts` });
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
  figures: z.array(figureSchema).default([]),
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
    routes: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1).describe('e.g. "AS Level: Papers 1 and 5"'),
          components: z.array(z.string().min(1)).min(1),
        }),
      )
      .default([])
      .describe("Allowed combinations of papers. Leave empty if every student takes every component."),
    topics: z
      .array(
        z.object({
          ref: z.string().min(1),
          title: z.string().min(1),
          summary: z.string().default(""),
          section: z.string().default("").describe("Group of topics that unlock in order, e.g. a paper's content"),
        }),
      )
      .min(1),
    components: z.array(
      z.object({
        ref: z.string().min(1),
        title: z.string().min(1),
        durationMin: z.number().int().positive(),
        totalMarks: z.number().int().positive(),
        section: z.string().default("").describe("Topic section this component assesses"),
      }),
    ),
    papers: z.array(paper).default([]),
  })
  .superRefine((file, ctx) => {
    const topicRefs = new Set(file.topics.map((t) => t.ref));
    const componentRefs = new Set(file.components.map((c) => c.ref));
    for (const route of file.routes)
      for (const ref of route.components)
        if (!componentRefs.has(ref))
          ctx.addIssue({ code: "custom", message: `Route "${route.name}": unknown component "${ref}"` });
    for (const p of file.papers) {
      if (!componentRefs.has(p.component))
        ctx.addIssue({ code: "custom", message: `${p.title}: unknown component "${p.component}"` });
      for (const q of p.questions)
        for (const part of q.parts)
          if (!topicRefs.has(part.topic))
            ctx.addIssue({
              code: "custom",
              message: `${p.title} Q${q.number}${part.label}: unknown topic "${part.topic}"`,
            });
    }
  });

export type ContentFile = z.infer<typeof contentFileSchema>;

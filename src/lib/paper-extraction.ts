// Turns a Cambridge question paper, mark scheme and examiner report (PDFs)
// into the app's content format using Claude. Only use with material you are
// licensed to use. Output is a draft for human review, never imported directly.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import type { ContentFile } from "./content-schema";

const extractedPart = z.object({
  label: z.string().describe('Part label exactly as printed, e.g. "(a)(i)"; empty string if the question has no parts'),
  topic: z.string().describe("Ref of the syllabus topic this part assesses, chosen from the list provided"),
  prompt: z.string().describe("The part's question text, transcribed exactly"),
  marks: z.number().int(),
  answerType: z.enum(["MULTIPLE_CHOICE", "NUMERIC", "SHORT_TEXT", "EXTENDED"]),
  options: z.array(z.object({ key: z.string(), text: z.string() })).describe("Multiple choice options; empty otherwise"),
  correctAnswer: z.string().describe("MULTIPLE_CHOICE: the option key. NUMERIC: the final value as a plain number. Otherwise empty"),
  tolerance: z.number().nullable().describe("NUMERIC only: absolute tolerance implied by the mark scheme's accepted range, else null"),
  acceptedAnswers: z.array(z.string()).describe("SHORT_TEXT only: every equivalent answer the mark scheme accepts"),
  markingPoints: z.array(z.object({ text: z.string(), marks: z.number().int() })).describe("Mark scheme points for this part, with their codes (M1, A1, B1 ...)"),
  examinerComment: z.string().describe("What the examiner report says about this part or question; empty if nothing"),
  needsDiagram: z.boolean().describe("True if the part cannot be answered without a figure, graph, map or image that text cannot reproduce"),
});

export const extractionSchema = z.object({
  questions: z.array(
    z.object({
      number: z.number().int(),
      stem: z.string().describe("Shared context for all parts. Reproduce small tables as text"),
      parts: z.array(extractedPart),
    }),
  ),
  warnings: z.array(z.string()).describe("Anything a reviewer should check: unclear scans, ambiguous mark schemes, guessed topics"),
});

export type Extraction = z.infer<typeof extractionSchema>;

export interface PaperInfo {
  component: string;
  series: string;
  variant: string;
  title: string;
}

const pdf = (data: Buffer, title: string): Anthropic.Beta.BetaRequestDocumentBlock => ({
  type: "document",
  title,
  source: { type: "base64", media_type: "application/pdf", data: data.toString("base64") },
});

export async function extractPaper(options: {
  client: Anthropic;
  subject: ContentFile;
  paper: PaperInfo;
  questionPaper: Buffer;
  markScheme: Buffer;
  examinerReport?: Buffer;
}): Promise<Extraction> {
  const { client, subject, paper } = options;
  const component = subject.components.find((c) => c.ref === paper.component);
  const topics = subject.topics.map((t) => `${t.ref}: ${t.title} (${t.summary})`).join("\n");

  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    pdf(options.questionPaper, "Question paper"),
    pdf(options.markScheme, "Mark scheme"),
  ];
  if (options.examinerReport) content.push(pdf(options.examinerReport, "Examiner report"));
  content.push({
    type: "text",
    text: `Convert this ${subject.subject.code} ${subject.subject.name} paper into structured practice questions.

Paper: ${paper.title} (${component?.title ?? `component ${paper.component}`}, ${paper.series}, variant ${paper.variant}).

Syllabus topics (use these refs for "topic"):
${topics}

How to convert:
- One entry per question, one part per separately marked item. Transcribe wording exactly; write maths in plain text (x², √, ≤, fractions as a/b).
- answerType: MULTIPLE_CHOICE for lettered options; NUMERIC when the final answer is a single number the app can check (set tolerance from any accepted range in the mark scheme); SHORT_TEXT for a brief answer with a fixed set of acceptable forms; EXTENDED for anything needing working, explanation or judgement.
- markingPoints: copy each mark scheme point for the part with its code and marks, including alternative methods and "or" partial-credit lines.
- examinerComment: summarise what the examiner report says about the part (common errors, what good answers did). The report may cover several papers and variants: use only comments for this paper.
- needsDiagram: true when the student must see a figure, graph, map or image to answer. Small tables can go into the stem as text instead.
- Add a warning for anything uncertain rather than guessing silently.`,
  });

  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: zodOutputFormat(extractionSchema) },
    messages: [{ role: "user", content }],
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") throw new Error("Claude declined to convert this paper");
  if (message.stop_reason === "max_tokens") throw new Error("The paper was too long to convert in one request");
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return extractionSchema.parse(JSON.parse(text));
}

type PaperContent = ContentFile["papers"][number];

/** Converts an extraction into the content format, dropping parts that need a diagram. */
export function toContentPaper(extraction: Extraction, paper: PaperInfo) {
  const skipped: string[] = [];
  const questions: PaperContent["questions"] = [];

  for (const q of extraction.questions) {
    const parts: PaperContent["questions"][number]["parts"] = [];
    for (const p of q.parts) {
      if (p.needsDiagram) {
        skipped.push(`Q${q.number}${p.label}: needs a diagram`);
        continue;
      }
      parts.push({
        label: p.label,
        topic: p.topic,
        prompt: p.prompt,
        marks: p.marks,
        answerType: p.answerType,
        ...(p.answerType === "MULTIPLE_CHOICE" ? { options: p.options } : {}),
        ...(p.correctAnswer ? { correctAnswer: p.correctAnswer } : {}),
        ...(p.tolerance !== null && p.answerType === "NUMERIC" ? { tolerance: p.tolerance } : {}),
        ...(p.answerType === "SHORT_TEXT" ? { acceptedAnswers: p.acceptedAnswers } : {}),
        markingPoints: p.markingPoints,
        examinerComment: p.examinerComment,
      });
    }
    if (parts.length) questions.push({ number: q.number, stem: q.stem, parts });
  }

  return { paper: { ...paper, questions } satisfies PaperContent, skipped };
}

// Converts a licensed Cambridge paper (PDFs) into a draft for review.
//
// npm run content:convert -- \
//   --subject content/igcse-0610-biology.json --component 2 --series "June 2024" --variant 22 \
//   --paper qp.pdf --mark-scheme ms.pdf [--examiner-report er.pdf]
//
// Writes content/drafts/<code>-<series>-<variant>.json and crops each figure
// into public/figures/. Check both against the PDFs, then add the paper to the
// subject with `npm run content:merge -- <draft>`. Needs poppler's pdftoppm.
// Needs ANTHROPIC_API_KEY.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { contentFileSchema } from "../src/lib/content-schema";
import { createFigureCropper } from "../src/lib/figure-crop";
import { extractPaper, toContentPaper } from "../src/lib/paper-extraction";

async function main() {
  const { values: args } = parseArgs({
    options: {
      subject: { type: "string" },
      component: { type: "string" },
      series: { type: "string" },
      variant: { type: "string" },
      title: { type: "string" },
      paper: { type: "string" },
      "mark-scheme": { type: "string" },
      "examiner-report": { type: "string" },
    },
  });
  for (const required of ["subject", "component", "series", "variant", "paper", "mark-scheme"] as const) {
    if (!args[required]) throw new Error(`Missing --${required}`);
  }

  const subjectFile = args.subject!;
  const subject = contentFileSchema.parse(JSON.parse(readFileSync(subjectFile, "utf8")));
  const info = {
    component: args.component!,
    series: args.series!,
    variant: args.variant!,
    title: args.title ?? `${args.series} Paper ${args.variant}`,
  };
  if (!subject.components.some((c) => c.ref === info.component)) {
    throw new Error(`Component "${info.component}" is not in ${subjectFile}`);
  }

  console.log(`Converting ${info.title} with Claude. This can take a few minutes…`);
  const extraction = await extractPaper({
    client: new Anthropic(),
    subject,
    paper: info,
    questionPaper: readFileSync(args.paper!),
    markScheme: readFileSync(args["mark-scheme"]!),
    examinerReport: args["examiner-report"] ? readFileSync(args["examiner-report"]) : undefined,
  });
  // Figures are cut out of the question paper and saved under public/figures/<code>/<paper>/.
  const slug = `${subject.subject.code}-${info.series}-${info.variant}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const figureDir = `${subject.subject.code}/${slug}`;
  const crop = createFigureCropper(args.paper!);
  const { paper, skipped } = await toContentPaper(extraction, info, async (figure, name) => {
    const src = `${figureDir}/${name}.png`;
    return (await crop(figure, join("public", "figures", src))) ? src : null;
  });

  // Validate as part of the subject so topic and component refs are checked.
  const check = contentFileSchema.safeParse({ ...subject, papers: [paper] });
  const problems = check.success ? [] : check.error.issues.map((i) => i.message);

  const dir = join("content", "drafts");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${slug}.json`);
  writeFileSync(
    out,
    JSON.stringify({ subjectFile: basename(subjectFile), paper, review: { warnings: extraction.warnings, skipped, problems } }, null, 2) + "\n",
  );

  const parts = paper.questions.reduce((n, q) => n + q.parts.length, 0);
  const figures = paper.questions.reduce((n, q) => n + q.figures.length + q.parts.reduce((m, p) => m + p.figures.length, 0), 0);
  console.log(`\nDraft written to ${out}: ${paper.questions.length} questions, ${parts} parts, ${figures} figures in public/figures/${figureDir}.`);
  if (figures) console.log("Check each cropped figure includes its labels and nothing from neighbouring questions.");
  for (const [heading, list] of [["Skipped", skipped], ["Check", extraction.warnings], ["Must fix before merging", problems]] as const) {
    if (list.length) console.log(`\n${heading}:\n${list.map((l) => `  - ${l}`).join("\n")}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

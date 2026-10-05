// Adds a reviewed draft paper to its subject file.
// npm run content:merge -- content/drafts/0610-june-2024-22.json
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contentFileSchema } from "../src/lib/content-schema";

const draftPath = process.argv[2];
if (!draftPath) {
  console.error("Usage: npm run content:merge -- <draft.json>");
  process.exit(1);
}

const draft = JSON.parse(readFileSync(draftPath, "utf8"));
const subjectPath = join("content", draft.subjectFile);
const subject = JSON.parse(readFileSync(subjectPath, "utf8"));

const sameKey = (p: { component: string; series: string; variant: string }) =>
  p.component === draft.paper.component && p.series === draft.paper.series && p.variant === draft.paper.variant;
const replaced = subject.papers.some(sameKey);
subject.papers = [...subject.papers.filter((p: typeof draft.paper) => !sameKey(p)), draft.paper];

const result = contentFileSchema.safeParse(subject);
if (!result.success) {
  console.error("The draft has problems to fix first:");
  for (const issue of result.error.issues) console.error(`  - ${issue.message}`);
  process.exit(1);
}

writeFileSync(subjectPath, JSON.stringify(subject, null, 2) + "\n");
unlinkSync(draftPath);
console.log(`${replaced ? "Replaced" : "Added"} ${draft.paper.title} in ${subjectPath}. Run npm run content:import to load it.`);

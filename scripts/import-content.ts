// Usage: npm run content:import [file.json ...]
// With no arguments every JSON file in /content is imported.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { importContent } from "../src/lib/import-content";

async function main() {
  const dir = join(__dirname, "..", "content");
  const files = process.argv.slice(2).length
    ? process.argv.slice(2)
    : readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => join(dir, f));

  const db = new PrismaClient();
  try {
    for (const file of files) {
      console.log(`Importing ${file}…`);
      const summary = await importContent(db, JSON.parse(readFileSync(file, "utf8")));
      console.log(`Imported ${summary.subject}: ${summary.topics} topics, ${summary.parts} question parts`);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

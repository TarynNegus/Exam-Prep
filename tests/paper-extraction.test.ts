import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { contentFileSchema } from "@/lib/content-schema";
import { createFigureCropper, pixelBox } from "@/lib/figure-crop";
import { toContentPaper, type Extraction, type ExtractedFigure } from "@/lib/paper-extraction";

const base = {
  options: [], correctAnswer: "", tolerance: null, acceptedAnswers: [], examinerComment: "", figures: [] as ExtractedFigure[],
  markingPoints: [{ text: "B1", marks: 1 }],
};
const graph: ExtractedFigure = { page: 2, left: 0.1, top: 0.2, right: 0.6, bottom: 0.5, caption: "Fig. 2.1", alt: "Graph of enzyme activity against temperature" };
const map: ExtractedFigure = { page: 3, left: 0.1, top: 0.1, right: 0.9, bottom: 0.9, caption: "", alt: "Map" };

const extraction: Extraction = {
  warnings: [],
  questions: [
    { number: 1, stem: "", figures: [], parts: [
      { ...base, label: "", topic: "2", prompt: "Which is in plant cells only?", marks: 1, answerType: "MULTIPLE_CHOICE",
        options: [{ key: "A", text: "cell wall" }, { key: "B", text: "ribosome" }], correctAnswer: "A" },
    ] },
    { number: 2, stem: "The graph shows enzyme activity.", figures: [graph], parts: [
      { ...base, label: "(a)", topic: "5", prompt: "Read the optimum from the graph.", marks: 1, answerType: "NUMERIC", correctAnswer: "37" },
      { ...base, label: "(b)", topic: "5", prompt: "Explain denaturation.", marks: 2, answerType: "EXTENDED" },
    ] },
    { number: 3, stem: "", figures: [], parts: [{ ...base, label: "", topic: "1", prompt: "Label the map.", marks: 2, answerType: "EXTENDED", figures: [map] }] },
  ],
};
const info = { component: "2", series: "June 2024", variant: "22", title: "June 2024 Paper 22" };

describe("toContentPaper", () => {
  it("attaches saved figures to the stem and parts", async () => {
    const { paper, skipped } = await toContentPaper(extraction, info, async (_f, name) => `0610/test/${name}.png`);
    expect(skipped).toEqual([]);
    expect(paper.questions[1].figures).toEqual([{ src: "0610/test/q2-1.png", alt: graph.alt, caption: "Fig. 2.1" }]);
    expect(paper.questions[2].parts[0].figures[0].src).toBe("0610/test/q3-1.png");
  });

  it("skips questions whose figures could not be saved", async () => {
    const { paper, skipped } = await toContentPaper(extraction, info, async (figure) => (figure === map ? null : "x/ok.png"));
    expect(skipped).toEqual(["Q3: its figure could not be cut out of the PDF"]);
    expect(paper.questions.map((q) => q.number)).toEqual([1, 2]);
  });

  it("keeps only the fields each answer type uses", async () => {
    const { paper } = await toContentPaper(extraction, info, async () => "x/ok.png");
    expect(paper.questions[0].parts[0]).toMatchObject({ options: [{ key: "A", text: "cell wall" }, { key: "B", text: "ribosome" }], correctAnswer: "A" });
    expect(paper.questions[1].parts[1]).not.toHaveProperty("options");
    expect(paper.questions[1].parts[1]).not.toHaveProperty("correctAnswer");
  });

  it("produces a paper that validates against its subject", async () => {
    const { paper } = await toContentPaper(extraction, info, async (_f, name) => `0610/test/${name}.png`);
    const subject = JSON.parse(readFileSync(join(__dirname, "..", "content", "igcse-0610-biology.json"), "utf8"));
    expect(contentFileSchema.safeParse({ ...subject, papers: [paper] }).success).toBe(true);
  });
});

describe("pixelBox", () => {
  it("pads and clamps the box to the page", () => {
    expect(pixelBox({ page: 1, left: 0, top: 0.5, right: 0.5, bottom: 1 }, 1000, 2000)).toEqual({ left: 0, top: 980, width: 510, height: 1020 });
  });

  it("rejects boxes outside the page or inside out", () => {
    expect(pixelBox({ page: 1, left: 0.5, top: 0, right: 0.4, bottom: 1 }, 100, 100)).toBeNull();
    expect(pixelBox({ page: 1, left: -0.1, top: 0, right: 0.4, bottom: 1 }, 100, 100)).toBeNull();
  });
});

/**
 * A one-page PDF (600 × 800 pt) with a black 200 × 200 pt square whose top-left
 * corner is 50 pt from the left and top edges, drawn with PDF vector operators.
 */
function squarePdf(): Buffer {
  const content = "0 0 0 rg 50 550 200 200 re f";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

describe("createFigureCropper", () => {
  it("cuts a figure out of a real PDF page", async () => {
    const dir = mkdtempSync(join(tmpdir(), "crop-test-"));
    const pdf = join(dir, "paper.pdf");
    writeFileSync(pdf, squarePdf());

    const out = join(dir, "figure.png");
    const crop = createFigureCropper(pdf);
    expect(await crop({ page: 1, left: 50 / 600, top: 50 / 800, right: 250 / 600, bottom: 250 / 800 }, out)).toBe(true);
    const { width, height } = await sharp(out).metadata();
    expect(width! / height!).toBeCloseTo(((200 / 600 + 0.02) * 600) / ((200 / 800 + 0.02) * 800), 1);
    // The centre of the crop is inside the black square.
    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const centre = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels;
    expect(data[centre]).toBeLessThan(50);
    expect(await crop({ page: 9, left: 0, top: 0, right: 1, bottom: 1 }, out)).toBe(false);
  });
});

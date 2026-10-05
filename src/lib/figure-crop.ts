import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import sharp from "sharp";

export interface FigureBox {
  page: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Margin added around each box, as a fraction of the page, so labels at the edge are kept. */
const PADDING = 0.01;

/** Converts a fractional box to pixels, padded and clamped to the page. Null if the box is invalid. */
export function pixelBox(box: FigureBox, width: number, height: number) {
  const values = [box.left, box.top, box.right, box.bottom];
  if (values.some((v) => !Number.isFinite(v) || v < 0 || v > 1) || box.right <= box.left || box.bottom <= box.top) return null;
  const left = Math.floor(Math.max(0, box.left - PADDING) * width);
  const top = Math.floor(Math.max(0, box.top - PADDING) * height);
  const right = Math.ceil(Math.min(1, box.right + PADDING) * width);
  const bottom = Math.ceil(Math.min(1, box.bottom + PADDING) * height);
  return { left, top, width: right - left, height: bottom - top };
}

/** Renders PDF pages with poppler's pdftoppm and crops figures out of them. */
export function createFigureCropper(pdfPath: string) {
  const workDir = mkdtempSync(join(tmpdir(), "figures-"));
  const pages = new Map<number, Buffer>();

  const renderPage = (page: number) => {
    if (!pages.has(page)) {
      const prefix = join(workDir, `page-${page}`);
      execFileSync("pdftoppm", ["-png", "-r", "200", "-f", String(page), "-l", String(page), "-singlefile", pdfPath, prefix]);
      pages.set(page, readFileSync(`${prefix}.png`));
    }
    return pages.get(page)!;
  };

  /** Saves the figure as a PNG at outPath. Returns false if the box or page is invalid. */
  return async function crop(box: FigureBox, outPath: string): Promise<boolean> {
    try {
      const image = sharp(renderPage(box.page));
      const { width, height } = await image.metadata();
      const area = width && height ? pixelBox(box, width, height) : null;
      if (!area) return false;
      mkdirSync(dirname(outPath), { recursive: true });
      await image.extract(area).png().toFile(outPath);
      return true;
    } catch {
      return false;
    }
  };
}

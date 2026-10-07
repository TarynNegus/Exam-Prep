// Layout and display rules for the periodic table pop-out. Element data is in ./elements.

export type DataSheetLevel = "IGCSE" | "AS_A_LEVEL";

/** Grid position: rows 1–7 are periods; rows 9 and 10 hold the lanthanoids and actinoids. */
export function elementPosition(z: number): { row: number; col: number } {
  if (z === 1) return { row: 1, col: 1 };
  if (z === 2) return { row: 1, col: 18 };
  const short = (start: number) => (z - start < 2 ? z - start + 1 : z - start + 11);
  if (z <= 10) return { row: 2, col: short(3) };
  if (z <= 18) return { row: 3, col: short(11) };
  if (z <= 36) return { row: 4, col: z - 18 };
  if (z <= 54) return { row: 5, col: z - 36 };
  const long = (start: number, row: number, fRow: number) => {
    const offset = z - start; // 0 for Cs / Fr
    if (offset < 2) return { row, col: offset + 1 };
    if (offset < 17) return { row: fRow, col: offset + 1 }; // La–Lu, Ac–Lr: columns 3–17
    return { row, col: offset - 14 + 1 };
  };
  if (z <= 86) return long(55, 6, 9);
  return long(87, 7, 10);
}

/**
 * Relative atomic mass as students see it on their data sheet: IGCSE uses whole numbers
 * (chlorine 35.5); AS & A Level uses one decimal place. "–" when there is no standard value.
 */
export function displayMass(mass: number | null, z: number, level: DataSheetLevel): string {
  if (mass === null) return "–";
  if (level === "AS_A_LEVEL") return mass.toFixed(1);
  return z === 17 ? "35.5" : String(Math.round(mass));
}

const ROMAN: Record<number, string> = {
  1: "I",
  2: "II",
  13: "III",
  14: "IV",
  15: "V",
  16: "VI",
  17: "VII",
  18: "VIII",
};

/** Group headings: Roman numerals for IGCSE (none over the transition elements), 1–18 for A Level. */
export function groupLabel(col: number, level: DataSheetLevel): string {
  return level === "AS_A_LEVEL" ? String(col) : (ROMAN[col] ?? "");
}

// On-screen symbol keys shown under answer boxes, so students can type square
// roots, powers, standard form, units and chemical formulae on any device.

import type { DataSheetLevel } from "./periodic-table";

export type KeyboardKind = "maths" | "physics" | "chemistry";

export interface SymbolKey {
  /** What the button shows. */
  label: string;
  /** Text inserted at the cursor (wrapping any selected text when `after` is set). */
  insert: string;
  /** Text placed after the cursor, e.g. the closing bracket of √( ). */
  after?: string;
  /** Spoken name for screen readers and the tooltip. */
  name: string;
}

const key = (label: string, name: string, insert = label, after?: string): SymbolKey => ({
  label,
  insert,
  after,
  name,
});

const ARITHMETIC = [
  key("×", "multiply"),
  key("÷", "divide"),
  key("−", "minus"),
  key("±", "plus or minus"),
  key("(", "open bracket"),
  key(")", "close bracket"),
];

export const KEYBOARDS: Record<KeyboardKind, SymbolKey[]> = {
  maths: [
    key("√", "square root", "√(", ")"),
    key("∛", "cube root", "∛(", ")"),
    key("x²", "squared", "²"),
    key("x³", "cubed", "³"),
    key("xⁿ", "to the power", "^"),
    key("π", "pi"),
    ...ARITHMETIC,
    key("/", "fraction bar"),
    key("°", "degrees"),
    key("≤", "less than or equal to"),
    key("≥", "greater than or equal to"),
    key("≠", "not equal to"),
  ],
  physics: [
    key("×10ⁿ", "times ten to the power", "×10^"),
    key("x²", "squared", "²"),
    key("x³", "cubed", "³"),
    key("⁻¹", "to the power minus one"),
    key("⁻²", "to the power minus two"),
    key("√", "square root", "√(", ")"),
    key("π", "pi"),
    ...ARITHMETIC,
    key("°", "degrees"),
    key("Ω", "ohm"),
    key("μ", "micro"),
    key("λ", "lambda"),
    key("θ", "theta"),
    key("Δ", "delta"),
  ],
  chemistry: [
    key("₀", "subscript zero"),
    key("₁", "subscript one"),
    key("₂", "subscript two"),
    key("₃", "subscript three"),
    key("₄", "subscript four"),
    key("₅", "subscript five"),
    key("₆", "subscript six"),
    key("₇", "subscript seven"),
    key("₈", "subscript eight"),
    key("₉", "subscript nine"),
    key("ₙ", "subscript n"),
    key("x²", "squared", "²"),
    key("x³", "cubed", "³"),
    key("xⁿ", "to the power", "^"),
    key("⁻¹", "to the power minus one"),
    key("⁻³", "to the power minus three"),
    key("×10ⁿ", "times ten to the power", "×10^"),
    key("⁺", "plus charge"),
    key("⁻", "minus charge"),
    key("²⁺", "two plus charge"),
    key("³⁺", "three plus charge"),
    key("²⁻", "two minus charge"),
    key("→", "reaction arrow"),
    key("⇌", "reversible reaction"),
    key("(aq)", "aqueous"),
    key("(s)", "solid"),
    key("(l)", "liquid"),
    key("(g)", "gas"),
    key("Δ", "delta"),
    key("°", "degrees"),
  ],
};

const SUBJECT_KEYBOARDS: Record<string, KeyboardKind> = {
  "0580": "maths",
  "9709": "maths",
  "0625": "physics",
  "9702": "physics",
  "0620": "chemistry",
  "9701": "chemistry",
};

export interface KeyboardSpec {
  kind: KeyboardKind;
  /** Decides how the periodic table shows masses and groups (IGCSE or A Level data sheet). */
  level: DataSheetLevel;
}

/** The symbol keyboard for a subject, or null for subjects that do not need one. */
export function keyboardFor(subject: { code: string; qualification: DataSheetLevel }): KeyboardSpec | null {
  const kind = SUBJECT_KEYBOARDS[subject.code];
  return kind ? { kind, level: subject.qualification } : null;
}

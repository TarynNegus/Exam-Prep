"use client";

import { KEYBOARDS, type KeyboardKind } from "@/lib/keyboards";

interface Props {
  kind: KeyboardKind;
  disabled?: boolean;
  onKey: (insert: string, after?: string) => void;
}

/** A row of symbol buttons that type into the answer box above it. */
export function SymbolKeys({ kind, disabled, onKey }: Props) {
  return (
    <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Symbols">
      {KEYBOARDS[kind].map((key) => (
        <button
          key={key.label}
          type="button"
          disabled={disabled}
          title={key.name}
          aria-label={key.name}
          // Keep focus (and the cursor position) in the answer box.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onKey(key.insert, key.after)}
          className="min-w-9 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useLayoutEffect, useRef } from "react";
import type { PublicPart } from "@/lib/feedback";
import type { KeyboardSpec } from "@/lib/keyboards";
import { SymbolKeys } from "./symbol-keys";

interface Props {
  part: PublicPart;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Symbol keys shown under typed answers, e.g. for maths and science subjects. */
  keyboard?: KeyboardSpec | null;
}

export function AnswerInput({ part, value, onChange, disabled, keyboard }: Props) {
  const name = `answer-${part.id}`;
  const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const pendingCaret = useRef<number | null>(null);

  // Put the cursor after an inserted symbol as soon as the new value is on screen,
  // so typing straight afterwards lands in the right place (e.g. inside √( )).
  useLayoutEffect(() => {
    const el = field.current;
    if (el && pendingCaret.current !== null) {
      el.focus();
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [value]);

  // Inserts a symbol at the cursor; with `after` (e.g. "√(" … ")") any selected text is wrapped.
  function insert(text: string, after = "") {
    const el = field.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    onChange(value.slice(0, start) + text + selected + after + value.slice(end));
    pendingCaret.current = start + text.length + selected.length;
  }
  const keys = keyboard && !disabled ? <SymbolKeys keyboard={keyboard} onKey={insert} /> : null;

  if (part.answerType === "MULTIPLE_CHOICE") {
    return (
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="sr-only">Choose one answer</legend>
        {part.options?.map((option) => (
          <label
            key={option.key}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
              value === option.key ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.key}
              checked={value === option.key}
              onChange={() => onChange(option.key)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold">{option.displayKey}</span> {option.text}
            </span>
          </label>
        ))}
      </fieldset>
    );
  }

  if (part.answerType === "EXTENDED") {
    return (
      <div className="space-y-2">
        <textarea
          ref={field}
          className="input min-h-32 font-mono"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Write your answer, showing all your working"
          aria-label="Your answer"
        />
        {keys}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={field}
        className="input max-w-sm"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        inputMode={part.answerType === "NUMERIC" ? "decimal" : "text"}
        placeholder={part.answerType === "NUMERIC" ? "Enter a number" : "Your answer"}
        aria-label="Your answer"
      />
      {keys}
    </div>
  );
}

"use client";

import type { PublicPart } from "@/lib/feedback";

interface Props {
  part: PublicPart;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function AnswerInput({ part, value, onChange, disabled }: Props) {
  const name = `answer-${part.id}`;

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
      <textarea
        className="input min-h-32 font-mono"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Write your answer, showing all your working"
        aria-label="Your answer"
      />
    );
  }

  return (
    <input
      className="input max-w-sm"
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      inputMode={part.answerType === "NUMERIC" ? "decimal" : "text"}
      placeholder={part.answerType === "NUMERIC" ? "Enter a number" : "Your answer"}
      aria-label="Your answer"
    />
  );
}

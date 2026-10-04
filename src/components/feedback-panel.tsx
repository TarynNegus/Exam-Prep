"use client";

import { useState, useTransition } from "react";
import type { PartFeedback } from "@/lib/feedback";

interface Props {
  feedback: PartFeedback;
  marks: number;
  /** null while the answer still needs self-marking */
  awardedMarks: number | null;
  autoMarked: boolean;
  onSelfMark?: (ticked: number[]) => Promise<void>;
}

export function FeedbackPanel({ feedback, marks, awardedMarks, autoMarked, onSelfMark }: Props) {
  const [ticked, setTicked] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();
  const needsSelfMark = awardedMarks === null;
  const full = awardedMarks === marks;

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
      {!needsSelfMark && (
        <div className={`font-semibold ${full ? "text-emerald-700" : awardedMarks === 0 ? "text-red-700" : "text-amber-700"}`}>
          {awardedMarks}/{marks} marks {autoMarked ? "" : "(self-marked)"}
        </div>
      )}
      {needsSelfMark && (
        <p className="font-medium text-slate-800">
          Mark your answer: tick each mark scheme point your answer meets, then confirm.
        </p>
      )}

      {feedback.modelAnswer && (
        <div>
          <h4 className="font-semibold text-slate-800">Answer</h4>
          <p>{feedback.modelAnswer}</p>
        </div>
      )}

      <div>
        <h4 className="font-semibold text-slate-800">Mark scheme</h4>
        <ul className="mt-1 space-y-1">
          {feedback.markingPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2">
              {needsSelfMark ? (
                <input
                  type="checkbox"
                  id={`mp-${i}`}
                  className="mt-1"
                  checked={ticked.includes(i)}
                  onChange={(e) => setTicked((t) => (e.target.checked ? [...t, i] : t.filter((x) => x !== i)))}
                />
              ) : (
                <span className="mt-0.5 text-slate-400">•</span>
              )}
              <label htmlFor={`mp-${i}`} className="flex-1">
                {point.text} <span className="text-slate-500">[{point.marks}]</span>
              </label>
            </li>
          ))}
        </ul>
        {needsSelfMark && onSelfMark && (
          <button
            className="btn-primary mt-3"
            disabled={pending}
            onClick={() => startTransition(() => onSelfMark(ticked))}
          >
            {pending ? "Saving…" : "Confirm my marks"}
          </button>
        )}
      </div>

      {feedback.examinerComment && (
        <div className="rounded-md border-l-4 border-brand-600 bg-white p-3">
          <h4 className="font-semibold text-slate-800">Examiner&apos;s report</h4>
          <p className="mt-1 text-slate-700">{feedback.examinerComment}</p>
        </div>
      )}
    </div>
  );
}

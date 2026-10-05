"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { PublicPart } from "@/lib/feedback";
import { submitPaper } from "@/lib/paper-actions";
import { AnswerInput } from "./answer-input";
import { Figures, type FigureData } from "./figures";

interface ExamQuestion {
  id: string;
  number: number;
  stem: string;
  figures: FigureData[];
  parts: PublicPart[];
}

interface Props {
  attemptId: string;
  title: string;
  deadline: number; // epoch ms
  questions: ExamQuestion[];
}

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExamPaper({ attemptId, title, deadline, questions }: Props) {
  const storageKey = `attempt-${attemptId}`;
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(() => deadline - Date.now());
  const [pending, startTransition] = useTransition();
  const submitted = useRef(false);

  // Restore answers saved in this browser, in case the page was reloaded.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setResponses(JSON.parse(saved));
    } catch {
      // storage unavailable; answers are kept in memory only
    }
  }, [storageKey]);

  const update = (partId: string, value: string) => {
    setResponses((prev) => {
      const next = { ...prev, [partId]: value };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    startTransition(async () => {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      await submitPaper(attemptId, responses);
    });
  }, [attemptId, responses, storageKey]);

  useEffect(() => {
    const timer = setInterval(() => setRemaining(deadline - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  useEffect(() => {
    if (remaining <= 0) submit();
  }, [remaining, submit]);

  const allParts = questions.flatMap((q) => q.parts);
  const answered = allParts.filter((p) => (responses[p.id] ?? "").trim() !== "").length;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="font-bold">{title}</h1>
          <p className="text-xs text-slate-500">
            {answered}/{allParts.length} parts answered
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-lg font-semibold ${remaining < 5 * 60_000 ? "text-red-600" : "text-slate-800"}`}
            aria-label="Time remaining"
          >
            {formatTime(remaining)}
          </span>
          <button
            className="btn-primary"
            disabled={pending}
            onClick={() => {
              if (confirm("Submit your paper now? You cannot change your answers afterwards.")) submit();
            }}
          >
            {pending ? "Submitting…" : "Submit paper"}
          </button>
        </div>
      </div>

      {questions.map((question) => (
        <article key={question.id} className="card space-y-4">
          <h2 className="font-semibold">Question {question.number}</h2>
          {question.stem && <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3">{question.stem}</p>}
          <Figures figures={question.figures} />
          {question.parts.map((part) => (
            <div key={part.id} className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <p className="whitespace-pre-line">
                  {part.label && <span className="mr-2 font-semibold">{part.label}</span>}
                  {part.prompt}
                </p>
                <span className="shrink-0 text-sm text-slate-500">[{part.marks}]</span>
              </div>
              <Figures figures={part.figures} />
              <AnswerInput part={part} value={responses[part.id] ?? ""} onChange={(v) => update(part.id, v)} disabled={pending} />
            </div>
          ))}
        </article>
      ))}
    </div>
  );
}

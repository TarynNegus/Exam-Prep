"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PublicPart } from "@/lib/feedback";
import { submitPracticeAnswer, submitSelfMark, type PracticeResult } from "@/lib/practice-actions";
import { AnswerInput } from "./answer-input";
import { FeedbackPanel } from "./feedback-panel";

interface Props {
  part: PublicPart;
  lastScore: number | null;
}

export function PartPractice({ part, lastScore }: Props) {
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [awarded, setAwarded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await submitPracticeAnswer(part.id, response);
        setResult(r);
        setAwarded(r.autoMarked ? r.awardedMarks : null);
        if (r.autoMarked) router.refresh(); // update topic progress
      } catch {
        setError("Something went wrong saving your answer. Please try again.");
      }
    });
  }

  async function selfMark(ticked: number[]) {
    if (!result) return;
    const { awardedMarks } = await submitSelfMark(result.answerId, ticked);
    setAwarded(awardedMarks);
    router.refresh();
  }

  function retry() {
    setResponse("");
    setResult(null);
    setAwarded(null);
  }

  return (
    <div className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
      <div className="mb-2 flex items-start justify-between gap-4">
        <p className="whitespace-pre-line">
          {part.label && <span className="mr-2 font-semibold">{part.label}</span>}
          {part.prompt}
        </p>
        <span className="shrink-0 text-sm text-slate-500">[{part.marks}]</span>
      </div>
      {lastScore !== null && !result && (
        <p className="mb-2 text-xs text-slate-500">Last attempt: {lastScore}/{part.marks}</p>
      )}

      <AnswerInput part={part} value={response} onChange={setResponse} disabled={!!result} />

      {!result ? (
        <button className="btn-primary mt-3" onClick={submit} disabled={pending || response.trim() === ""}>
          {pending ? "Marking…" : "Submit answer"}
        </button>
      ) : (
        <>
          <FeedbackPanel
            feedback={result}
            marks={result.marks}
            awardedMarks={awarded}
            autoMarked={result.autoMarked}
            onSelfMark={selfMark}
          />
          {awarded !== null && (
            <button className="btn-secondary mt-3" onClick={retry}>Try again</button>
          )}
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

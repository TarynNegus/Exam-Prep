"use client";

import { useRouter } from "next/navigation";
import type { PartFeedback } from "@/lib/feedback";
import { submitSelfMark } from "@/lib/practice-actions";
import { FeedbackPanel } from "./feedback-panel";

interface Props {
  answerId: string;
  feedback: PartFeedback;
  marks: number;
  awardedMarks: number;
  pendingReview: boolean;
  selfMarked: boolean;
}

export function ResultPart({ answerId, feedback, marks, awardedMarks, pendingReview, selfMarked }: Props) {
  const router = useRouter();
  return (
    <FeedbackPanel
      feedback={feedback}
      marks={marks}
      awardedMarks={pendingReview ? null : awardedMarks}
      autoMarked={!selfMarked}
      onSelfMark={async (ticked) => {
        await submitSelfMark(answerId, ticked);
        router.refresh();
      }}
    />
  );
}

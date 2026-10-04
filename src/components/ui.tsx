import type { TopicStatus } from "@/lib/progress";

export const QUALIFICATION_LABEL = { IGCSE: "Cambridge IGCSE", AS_A_LEVEL: "AS & A Level" } as const;

export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-slate-600">
          <span>{label}</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<TopicStatus, [string, string]> = {
  NOT_STARTED: ["Not started", "bg-slate-100 text-slate-600"],
  IN_PROGRESS: ["In progress", "bg-amber-100 text-amber-800"],
  COMPLETE: ["Complete", "bg-emerald-100 text-emerald-800"],
};

export function StatusBadge({ status }: { status: TopicStatus }) {
  const [text, style] = STATUS_STYLE[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{text}</span>;
}

export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "brand" | "amber" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    brand: "bg-brand-100 text-brand-700",
    amber: "bg-amber-100 text-amber-800",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

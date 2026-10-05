export interface FigureData {
  src: string;
  alt: string;
  caption?: string;
}

/** Diagrams, graphs and maps attached to a question or part. Files live in public/figures/. */
export function Figures({ figures }: { figures: unknown }) {
  const list = Array.isArray(figures) ? (figures as FigureData[]) : [];
  if (list.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-4">
      {list.map((figure) => (
        <figure key={figure.src} className="max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- static diagrams, sizes vary */}
          <img
            src={`/figures/${figure.src}`}
            alt={figure.alt}
            className="max-h-96 max-w-full rounded-lg border border-slate-200 bg-white p-2"
            loading="lazy"
          />
          {figure.caption && <figcaption className="mt-1 text-center text-xs text-slate-500">{figure.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

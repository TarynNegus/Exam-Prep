"use client";

import { useRef } from "react";
import { ELEMENTS } from "@/lib/elements";
import { displayMass, elementPosition, groupLabel, type DataSheetLevel } from "@/lib/periodic-table";

interface Props {
  level: DataSheetLevel;
  /** Called with an element's symbol when the student clicks it. */
  onPick?: (symbol: string) => void;
}

/** A "Periodic table" button that opens the table in a pop-out window over the page. */
export function PeriodicTableButton({ level, onPick }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => dialog.current?.showModal()}
        className="rounded-md border border-brand-600 bg-brand-50 px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-100"
      >
        Periodic table
      </button>
      <dialog
        ref={dialog}
        aria-label="Periodic table of the elements"
        className="m-auto w-[min(1100px,96vw)] max-w-none rounded-xl border border-slate-200 p-0 shadow-xl backdrop:bg-slate-900/40"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close(); // click outside the table
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-semibold">Periodic table of the elements</h2>
            <p className="text-xs text-slate-500">
              Atomic number, symbol and relative atomic mass
              {level === "IGCSE" ? " (as on the IGCSE data sheet)" : " (as on the AS & A Level data booklet)"}.
              {onPick ? " Click an element to type its symbol." : ""}
            </p>
          </div>
          <button type="button" onClick={() => dialog.current?.close()} className="btn-secondary" autoFocus>
            Close
          </button>
        </div>
        <p className="px-4 pt-2 text-xs text-slate-500 sm:hidden">Scroll sideways to see the whole table.</p>
        <div className="overflow-x-auto p-3">
          <PeriodicTableGrid
            level={level}
            onPick={
              onPick &&
              ((symbol) => {
                onPick(symbol);
                dialog.current?.close();
              })
            }
          />
        </div>
      </dialog>
    </>
  );
}

function PeriodicTableGrid({ level, onPick }: Props) {
  const cols = Array.from({ length: 18 }, (_, i) => i + 1);
  return (
    <div
      className="grid min-w-[760px] gap-[3px] text-center"
      style={{
        gridTemplateColumns: "repeat(18, minmax(0, 1fr))",
        gridTemplateRows: "auto repeat(7, auto) 10px repeat(2, auto)",
      }}
    >
      {cols.map((col) => (
        <div
          key={`g${col}`}
          style={{ gridRow: 1, gridColumn: col }}
          className="text-[11px] font-semibold text-slate-500"
        >
          {groupLabel(col, level)}
        </div>
      ))}
      <div
        style={{ gridRow: 7, gridColumn: 3 }}
        className="flex items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-500"
      >
        57–71
      </div>
      <div
        style={{ gridRow: 8, gridColumn: 3 }}
        className="flex items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-500"
      >
        89–103
      </div>
      {ELEMENTS.map(([z, symbol, name, mass]) => {
        const { row, col } = elementPosition(z);
        const content = (
          <>
            <span className="block text-[9px] leading-none text-slate-500">{z}</span>
            <span className="block text-sm font-bold leading-tight">{symbol}</span>
            <span className="block text-[9px] leading-none text-slate-600">{displayMass(mass, z, level)}</span>
          </>
        );
        // +1 for the group heading row; rows 9–10 (f-block) sit after a spacer row.
        const style = { gridRow: row + 1, gridColumn: col };
        const cell = "rounded border border-slate-200 bg-white px-0.5 py-1";
        return onPick ? (
          <button
            key={z}
            type="button"
            title={name}
            aria-label={`${name}, ${symbol}`}
            style={style}
            onClick={() => onPick(symbol)}
            className={`${cell} hover:border-brand-600 hover:bg-brand-50`}
          >
            {content}
          </button>
        ) : (
          <div key={z} title={name} style={style} className={cell}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

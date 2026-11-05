import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-black-100 rounded-md p-6 ${className}`}>{children}</div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-black-400">{label}</div>
      <div className="font-display text-2xl md:text-3xl font-semibold mt-1 text-black-800 tabular-nums">
        {value}
      </div>
      {sub && <div className="text-xs text-black-400 mt-1">{sub}</div>}
    </Card>
  );
}

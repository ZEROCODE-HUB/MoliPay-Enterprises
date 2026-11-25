import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-lg p-5 ${className}`}>{children}</div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-2xl md:text-3xl font-medium mt-1 text-foreground tabular-nums">
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

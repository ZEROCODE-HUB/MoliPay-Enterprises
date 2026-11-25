import type { ReactNode } from "react";

/** React 19: `ref` llega como prop y va al input (sirve para register() de react-hook-form). */
export function Input(
  p: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> },
) {
  return (
    <input
      {...p}
      className={`w-full h-10 px-3 rounded-md border border-border bg-card text-sm text-foreground outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100 placeholder:text-muted-foreground disabled:bg-muted/40 disabled:text-muted-foreground ${p.className ?? ""}`}
    />
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-foreground mb-1.5 block">
      {children}
    </label>
  );
}

export function Select(
  p: React.SelectHTMLAttributes<HTMLSelectElement> & { ref?: React.Ref<HTMLSelectElement> },
) {
  return (
    <select
      {...p}
      className={`h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-navy-100 disabled:opacity-60 ${p.className ?? ""}`}
    />
  );
}

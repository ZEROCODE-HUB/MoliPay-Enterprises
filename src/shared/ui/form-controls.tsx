import type { ReactNode } from "react";

/** React 19: `ref` llega como prop y va al input (sirve para register() de react-hook-form). */
export function Input(
  p: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> },
) {
  return (
    <input
      {...p}
      className={`w-full h-10 px-3 rounded-sm border border-black-100 bg-white text-sm text-black-700 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100 placeholder:text-black-300 disabled:bg-plata-100 disabled:text-black-300 ${p.className ?? ""}`}
    />
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-semibold text-black-700 mb-1.5 block">
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

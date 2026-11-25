export function BtnPrimary({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:bg-red-600 active:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 ${p.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function BtnOutline({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-border bg-card text-foreground text-sm font-medium cursor-pointer hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 ${p.className ?? ""}`}
    >
      {children}
    </button>
  );
}

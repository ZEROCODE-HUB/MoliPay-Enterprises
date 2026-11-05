export function BtnPrimary({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 h-10 px-5 rounded-sm bg-red-500 text-white text-sm font-semibold cursor-pointer hover:bg-red-400 active:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 ${p.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function BtnOutline({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 h-10 px-5 rounded-sm border border-black-200 bg-white text-black-700 text-sm font-semibold cursor-pointer hover:bg-black-50 active:bg-black-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 ${p.className ?? ""}`}
    >
      {children}
    </button>
  );
}

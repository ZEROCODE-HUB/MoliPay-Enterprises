export function Eyebrow({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent" | "light";
}) {
  const color =
    tone === "accent" ? "#D3001F" : tone === "light" ? "rgba(255,255,255,0.7)" : "#909090";
  return (
    <div className="font-sans text-xs font-medium" style={{ color }}>
      {children}
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`transition-colors duration-300 bg-white border border-black-100 rounded-md shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

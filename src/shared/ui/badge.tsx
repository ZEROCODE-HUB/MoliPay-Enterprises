import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger";
}) {
  const styles: Record<string, string> = {
    neutral: "bg-plata-200 text-black-600",
    success: "bg-success-bg text-success",
    warn: "bg-warning-bg text-warning",
    danger: "bg-error-bg text-error",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

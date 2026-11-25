import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger";
}) {
  const styles: Record<string, string> = {
    neutral: "bg-plata-200 text-muted-foreground",
    success: "bg-success-bg text-success",
    warn: "bg-warning-bg text-warning",
    danger: "bg-error-bg text-error",
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium leading-4 whitespace-nowrap ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

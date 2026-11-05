import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-black-800">
          {title}
        </h1>
        {description && <p className="text-sm text-black-400 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

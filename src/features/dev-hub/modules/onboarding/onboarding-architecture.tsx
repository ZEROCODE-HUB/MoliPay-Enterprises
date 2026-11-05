import { Fragment, type ReactNode } from "react";
import { PROPOSAL_SECTIONS, type ProposalBlock } from "./onboarding-architecture.data";
import { ProposalErd } from "./proposal-erd";

/** Texto con **negrita** y `codigo` en linea. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.+?\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        let node: ReactNode = part;
        if (part.startsWith("**")) {
          node = (
            <strong className="font-semibold text-foreground">
              <RichText text={part.slice(2, -2)} />
            </strong>
          );
        } else if (part.startsWith("`")) {
          node = (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] break-words">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}

function Block({ block }: { block: ProposalBlock }) {
  switch (block.kind) {
    case "p":
      return (
        <p className="my-3 text-sm leading-relaxed">
          <RichText text={block.text} />
        </p>
      );
    case "h3":
      return (
        <h3 className="mt-6 mb-2 font-display text-base font-semibold">
          <RichText text={block.text} />
        </h3>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List
          className={`my-3 space-y-1.5 pl-5 text-sm ${block.ordered ? "list-decimal" : "list-disc"}`}
        >
          {block.items.map((item) => (
            <li key={item}>
              <RichText text={item} />
            </li>
          ))}
        </List>
      );
    }
    case "table":
      return (
        <div className="my-3 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[560px] border-collapse text-left text-xs">
            <thead className="bg-muted/60">
              <tr>
                {block.head.map((cell) => (
                  <th key={cell} className="border-b px-3 py-2 font-semibold">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join("|")} className="border-b align-top last:border-b-0">
                  {row.map((cell, i) => (
                    <td key={i} className="px-3 py-2">
                      <RichText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "code":
      return (
        <pre className="my-3 overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
          {block.text}
        </pre>
      );
    case "details":
      return (
        <details className="my-3 rounded-lg border bg-muted/40 p-3">
          <summary className="cursor-pointer text-sm font-semibold">{block.summary}</summary>
          <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed">{block.text}</pre>
        </details>
      );
    case "erd":
      return <ProposalErd />;
  }
}

/** Propuesta de diseno del onboarding PF/PJ y KYC. Solo diseno: no se ejecuto nada en la base. */
export default function OnboardingArchitecture() {
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Propuesta para revisar. Es solo diseño: no se ejecutó nada en la base.
      </p>
      <nav aria-label="Secciones" className="mb-6 rounded-lg border bg-card p-4">
        <ol className="grid list-decimal gap-1 pl-5 text-sm sm:grid-cols-2">
          {PROPOSAL_SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-primary hover:underline">
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {PROPOSAL_SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="mb-6 scroll-mt-20 rounded-lg border bg-card p-5"
        >
          <h2 className="font-display text-lg font-semibold">{section.title}</h2>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </section>
      ))}
    </div>
  );
}

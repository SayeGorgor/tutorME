"use client";

import { useId, useState, type ReactNode } from "react";

/** Keep sidebar content in one place; disclose it in the document flow on smaller screens. */
export default function ResponsivePanel({ title, children }: { title: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  return (
    <section className="min-w-0 rounded-xl bg-white p-4 text-black lg:h-fit">
      <h2 className="hidden text-lg font-bold mb-2 lg:block">{title}</h2>
      <button type="button" className="flex min-h-11 w-full items-center justify-between gap-4 text-left text-lg font-bold lg:hidden"
        aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(!expanded)}>
        {title}<span className="text-sm font-normal">{expanded ? "Hide" : "Show"}</span>
      </button>
      <div id={panelId} className={`${expanded ? "block" : "hidden"} pt-3 lg:block lg:pt-0`}>{children}</div>
    </section>
  );
}

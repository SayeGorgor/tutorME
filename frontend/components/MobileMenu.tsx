"use client";

import { useRef, type ReactNode } from "react";

/** Native disclosure keeps navigation usable before hydration, without a modal focus trap. */
export default function MobileMenu({ children }: { children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={menu} className="mobile-menu group min-w-0 lg:hidden" onKeyDown={(event) => {
      if (event.key === "Escape" && menu.current) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    }}>
      <summary className="ml-auto flex size-11 cursor-pointer list-none items-center justify-center rounded-md border border-current/20 [&::-webkit-details-marker]:hidden">
        <span className="sr-only group-open:hidden">Open menu</span>
        <span className="sr-only hidden group-open:inline">Close menu</span>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="size-6 group-open:hidden">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="hidden size-6 group-open:block">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </summary>
      <div className="mt-3 flex max-h-[70dvh] flex-col gap-2 overflow-y-auto pb-2" onClick={(event) => {
        if ((event.target as HTMLElement).closest("a, button") && menu.current) menu.current.open = false;
      }}>{children}</div>
    </details>
  );
}

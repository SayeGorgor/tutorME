"use client";

import { useRef, type ReactNode } from "react";

/** Native disclosure keeps navigation usable before hydration, without a modal focus trap. */
export default function MobileMenu({ children }: { children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={menu} className="group w-full lg:hidden" onKeyDown={(event) => {
      if (event.key === "Escape" && menu.current) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    }}>
      <summary className="ml-auto flex min-h-11 w-fit cursor-pointer list-none items-center rounded-md border border-current/20 px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Menu</span>
        <span className="hidden group-open:inline">Close menu</span>
      </summary>
      <div className="mt-3 flex max-h-[70dvh] flex-col gap-2 overflow-y-auto pb-2" onClick={(event) => {
        if ((event.target as HTMLElement).closest("a, button") && menu.current) menu.current.open = false;
      }}>{children}</div>
    </details>
  );
}

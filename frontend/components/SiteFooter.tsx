import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer mx-auto mt-auto w-full border-t border-slate-200 px-5 py-6 text-sm text-slate-600 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 sm:flex-row">
        <p className="max-w-2xl text-xs">
          TutorME is an independently developed portfolio project demonstrating a tutoring
          marketplace. Some profiles may contain labeled sample data. Features and service
          availability may vary as development continues.
        </p>
        <nav
          aria-label="Legal information"
          className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center"
        >
          <Link className="underline underline-offset-4" href="/terms">
            Terms of Use
          </Link>
          <Link className="underline underline-offset-4" href="/privacy">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}

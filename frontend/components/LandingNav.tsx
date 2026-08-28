import Link from "next/link";

export default function LandingNav() {
  return (
    <nav className="flex w-full items-center justify-between border-black/[.08] bg-white px-16 py-4 dark:border-white/[.145] dark:bg-black">
        <Link id="logo" className="text-[1.8rem] text-indigo-500 font-sans my-0" href="/">
            tutorME
        </Link>
        <div id="nav-links" className="flex items-center gap-30">
          <div id="nav-info-links" className="flex gap-1">
              <Link href="/login" className="rounded-md px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-black/[.8] hover:text-white dark:border-white/[.145] dark:text-white dark:hover:bg-white/[.04]">
                  Find Tutors
              </Link>
              <Link href="/signup" className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-black/[.8] hover:text-white dark:bg-white dark:text-black dark:hover:bg-white/[.8]">
                  How It Works
              </Link>
              <Link href="/signup" className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-black/[.8] hover:text-white dark:bg-white dark:text-black dark:hover:bg-white/[.8]">
                  Become A Tutor
              </Link>
          </div>
          <div id="nav-login-links" className="flex gap-4">
              <Link href="/login" className="rounded-md border border-solid border-black/[.08] px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-black/[.04] dark:border-white/[.145] dark:text-white dark:hover:bg-white/[.04]">
                  Log In
              </Link>
              <Link href="/signup" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-black/[.8] dark:bg-white dark:text-black dark:hover:bg-white/[.8]">
                  Sign Up
              </Link>
          </div>
        </div>
    </nav>
    );
}
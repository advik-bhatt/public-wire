"use client";

import Link from "next/link";

type Props = { variant?: "solid" | "overlay" };

export function Masthead({ variant = "solid" }: Props) {
  const overlay = variant === "overlay";
  const textColor = overlay ? "text-white" : "text-black";
  const hover = overlay ? "hover:text-neutral-400" : "hover:text-neutral-500";

  return (
    <header
      className={
        overlay
          ? "absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 md:p-8"
          : "sticky top-0 z-30 border-b border-black/10 bg-white p-4 sm:p-5 md:px-8"
      }
    >
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className={`${textColor} shrink-0 text-xs uppercase tracking-[0.04em] sm:text-sm`}
        >
          PublicWire
        </Link>
        <nav className="flex min-w-0 items-center gap-3 sm:gap-6 md:gap-10">
          <Link
            href="/#how"
            className={`${textColor} ${hover} whitespace-nowrap text-[.62rem] uppercase tracking-[0.04em] transition-colors duration-300 sm:text-xs md:text-sm`}
          >
            How it works
          </Link>
          <Link
            href="/#agents"
            className={`${textColor} ${hover} whitespace-nowrap text-[.62rem] uppercase tracking-[0.04em] transition-colors duration-300 sm:text-xs md:text-sm`}
          >
            Newsroom
          </Link>
          <Link
            href="/#trust"
            className={`${textColor} ${hover} hidden whitespace-nowrap text-xs uppercase tracking-[0.04em] transition-colors duration-300 md:inline md:text-sm`}
          >
            Trust
          </Link>
        </nav>
      </div>
    </header>
  );
}

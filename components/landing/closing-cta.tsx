"use client";

import { SearchDialog } from "./search-dialog";

export function ClosingCTA() {
  return (
    <section className="relative overflow-hidden bg-white text-black py-28 md:py-40 border-t border-black/10">
      <svg
        aria-hidden="true"
        className="cta-orbit pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 900 900"
      >
        <circle cx="450" cy="450" r="220" />
        <circle cx="450" cy="450" r="330" />
        <circle cx="450" cy="450" r="420" />
        <circle className="cta-orbit-node" cx="450" cy="30" r="5" />
      </svg>
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 text-center">
        <span className="inline-flex items-center gap-3 text-[0.7rem] md:text-xs uppercase tracking-[0.22em] text-neutral-500 mb-8">
          <span className="w-8 h-px bg-black/40" />
          Civic edition
          <span className="w-8 h-px bg-black/40" />
        </span>
        <h2 className="text-5xl md:text-8xl lg:text-9xl font-bold leading-[0.9] tracking-tight mb-10 text-balance">
          See what is known
          <br />
          in your town.
        </h2>
        <p className="text-lg md:text-2xl text-neutral-600 leading-snug font-light mb-10 max-w-2xl mx-auto">
          Confirmed briefs, disclosed investigations, reference runs, and
          private work remain mechanically distinct.
        </p>
        <div className="flex justify-center">
          <SearchDialog
            trigger={
              <button className="btn-solid-dark">Find your edition →</button>
            }
          />
        </div>
      </div>
    </section>
  );
}

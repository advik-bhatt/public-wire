"use client";

import { motion, useReducedMotion } from "framer-motion";

const COMPARISONS = [
  {
    option: "Raw government sites",
    problem:
      "Accurate but scattered, slow to search, and written for compliance instead of residents.",
    publicWire:
      "One readable paper across state, county, city, transit, school, campus, and neighborhood layers.",
  },
  {
    option: "Search engines",
    problem:
      "Good for finding pages, weak at remembering what changed and why it matters locally.",
    publicWire:
      "The durable workflow is designed to compare captured source versions and separate material changes from routine updates.",
  },
  {
    option: "Social feeds",
    problem:
      "Fast, but noisy, unverified, and easy to detach from the original public record.",
    publicWire:
      "A confirmed brief links to reader-safe claim receipts, verification stages, and an immutable update record.",
  },
  {
    option: "Traditional local news",
    problem:
      "Valuable but thinly staffed; many civic updates never become articles.",
    publicWire:
      "A civic desk can expand source monitoring while deterministic gates keep unsupported work out of publication.",
  },
];

const LEVELS = [
  "State",
  "County",
  "City",
  "Township",
  "Neighborhood",
  "Campus",
  "Transit",
  "Schools",
];

export function Comparison() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="bg-white text-black py-24 md:py-32 border-t border-black/10">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-20 mb-16">
          <div>
            <h3 className="uppercase mb-6 text-xs md:text-sm tracking-[0.22em] text-neutral-500">
              § 05 , Why it wins
            </h3>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[0.92] tracking-tight text-balance">
              The convenience of a feed.
              <br />
              The discipline of a newsroom.
            </h2>
          </div>
          <div className="self-end">
            <p className="text-lg md:text-2xl text-neutral-700 leading-snug font-light text-balance mb-8">
              PublicWire is built for civic information that lives across
              layers. It does not ask residents to know which agency owns a
              problem before they can understand what changed.
            </p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((level) => (
                <span
                  key={level}
                  className="text-[0.65rem] uppercase tracking-[0.16em] px-2 py-1 border border-black/20"
                >
                  {level}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-px bg-black/10 border border-black/10">
          {COMPARISONS.map((item, index) => (
            <motion.article
              key={item.option}
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: reduceMotion ? 0 : 0.5,
                delay: reduceMotion ? 0 : index * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="bg-white p-6 md:p-7 min-h-[320px] flex flex-col"
            >
              <div className="text-[0.65rem] uppercase tracking-[0.18em] text-neutral-500 mb-3">
                Compared with
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-5">
                {item.option}
              </h3>
              <div className="space-y-5 mt-auto">
                <div className="border-t border-black/15 pt-3">
                  <div className="text-[0.65rem] uppercase tracking-[0.16em] text-neutral-500 mb-2">
                    The gap
                  </div>
                  <p className="text-sm text-neutral-700 leading-relaxed">
                    {item.problem}
                  </p>
                </div>
                <div className="border-t border-black pt-3">
                  <div className="text-[0.65rem] uppercase tracking-[0.16em] text-black mb-2">
                    PublicWire
                  </div>
                  <p className="text-sm text-neutral-900 leading-relaxed">
                    {item.publicWire}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

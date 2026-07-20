"use client";

import Image from "next/image";
import {
  useReducedMotion,
  useScroll,
  useTransform,
  motion,
} from "framer-motion";
import { useRef } from "react";
import { Masthead } from "./masthead";
import { SearchDialog } from "./search-dialog";

export function Hero({ dateLabel }: { dateLabel: string }) {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0vh", "-20vh"]);
  const reducedMotion = useReducedMotion();

  return (
    <div
      ref={container}
      className="relative min-h-[max(100svh,44rem)] overflow-hidden"
    >
      <Masthead variant="overlay" />
      <motion.div
        style={reducedMotion ? undefined : { y }}
        className="relative min-h-[max(100svh,44rem)]"
      >
        <Image
          src="/images/newspaper1.avif"
          alt="Stack of local newspapers"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover" }}
          className="brightness-[0.55] grayscale"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/70"
        />
        {/* Dateline at top edge over image */}
        <div className="absolute top-24 left-6 md:left-10 z-10 text-white">
          <span className="inline-flex items-center gap-3 text-[0.7rem] md:text-xs uppercase tracking-[0.22em]">
            <span className="w-8 h-px bg-white/60" />
            Civic Edition · Vol. I · Issue 001
          </span>
        </div>

        <div className="absolute inset-0 flex items-end z-10">
          <div className="text-left text-white max-w-5xl px-6 md:px-10 pb-20 md:pb-28">
            <h1 className="text-5xl md:text-7xl lg:text-9xl font-bold leading-[0.92] tracking-tight mb-6 text-balance [text-shadow:0_2px_24px_rgba(0,0,0,.65)]">
              Your town,
              <br />
              covered by
              <br />
              civic agents.
            </h1>
            <div className="relative mb-8 inline-block max-w-2xl">
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-x-3 -inset-y-2 md:-inset-x-4 md:-inset-y-3 bg-black/18 backdrop-blur-[2px]"
                  style={{
                    maskImage:
                      "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.78) 58%, rgba(0,0,0,0.22) 86%, transparent 100%)",
                  }}
                />
                <p
                  className="relative text-sm md:text-base lg:text-lg leading-relaxed text-white font-medium"
                  style={{
                    textShadow:
                      "0 0 6px rgba(255,255,255,0.65), 0 0 18px rgba(255,255,255,0.38), 0 2px 10px rgba(0,0,0,0.9), 0 4px 24px rgba(0,0,0,0.75)",
                  }}
                >
                  PublicWire is a civic investigation system designed to watch
                  public records, compare changes, verify material claims, and
                  publish only after evidence and reliability gates pass.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SearchDialog
                trigger={
                  <button className="btn-outline-light">
                    Find your edition →
                  </button>
                }
              />
              <a href="#how" className="btn-outline-light border-white/40">
                How it works
              </a>
            </div>
          </div>
        </div>

        {/* Bottom dateline strip */}
        <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/20 bg-black/30 backdrop-blur-sm">
          <div className="px-6 md:px-10 py-3 flex flex-wrap items-center justify-between gap-2 text-[0.65rem] md:text-xs uppercase tracking-[0.22em] text-white/70">
            <span>{dateLabel}</span>
            <span>Google ADK · evidence-backed civic workflow</span>
            <span className="hidden md:inline">Scroll ↓</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

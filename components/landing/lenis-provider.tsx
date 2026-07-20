"use client";

import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";

export function LenisProvider() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;
    let frame: number | undefined;

    function stop() {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      lenis?.destroy();
      lenis = undefined;
    }

    function start() {
      if (lenis || reducedMotion.matches) return;
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    }

    const syncPreference = () => (reducedMotion.matches ? stop() : start());
    reducedMotion.addEventListener("change", syncPreference);
    start();

    return () => {
      reducedMotion.removeEventListener("change", syncPreference);
      stop();
    };
  }, []);

  return null;
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

/**
 * Wraps the page body in a soft opacity fade on every route change.
 * Keyed on pathname so navigation (including the browser back button)
 * re-triggers the entrance even when the cached tree is restored.
 */
export function PageTransition({ children }: Props) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: reducedMotion ? 0 : 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{ minHeight: "100%" }}
    >
      {children}
    </motion.div>
  );
}

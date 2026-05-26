"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

type AgentCard = {
  name: string;
  provider: string;
  role: string;
  reviewer?: boolean;
};

const AGENTS: AgentCard[] = [
  {
    name: "Source Scout",
    provider: "Nimble",
    role: "Searches public civic surfaces for official and public updates tied to the selected area.",
  },
  {
    name: "Change Ledger",
    provider: "ClickHouse",
    role: "Stores scan events, metrics, request demand, rejected items, and publication history.",
  },
  {
    name: "Editorial Agent",
    provider: "Internal",
    role: "Evaluates whether a detected civic change is resident-relevant, routine, unsupported, or publishable.",
  },
  {
    name: "Grounding Agent",
    provider: "Senso",
    role: "Grounds the brief against source context before it appears in the local edition.",
  },
  {
    name: "Reliability Reviewer",
    provider: "Datadog Lapdog",
    role: "Traces the agent chain and helps expose weak claims, missing support, and reliability issues.",
    reviewer: true,
  },
];

export function AgentSwarm() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-10vh", "10vh"]);

  return (
    <section
      ref={container}
      id="agents"
      className="relative overflow-hidden min-h-screen py-24 md:py-32 flex items-center"
      style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
    >
      <div className="fixed top-[-10vh] left-0 h-[120vh] w-full">
        <motion.div style={{ y }} className="relative w-full h-full">
          <Image
            src="/images/spiral-circles.jpg"
            fill
            alt="Abstract spiral network behind civic intelligence agents"
            style={{ objectFit: "cover" }}
            className="brightness-[0.38] grayscale"
          />
        </motion.div>
      </div>
      <div className="absolute inset-0 bg-black/35" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10 text-white">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-20 mb-16">
          <div>
            <h3 className="uppercase mb-6 text-xs md:text-sm tracking-[0.22em] text-neutral-300">
              § 06, The chain
            </h3>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[0.92] tracking-tight text-balance">
              Five agent steps.<br />One inspectable chain.
            </h2>
          </div>
          <p className="text-lg md:text-2xl text-neutral-200 leading-snug font-light text-balance self-end max-w-2xl">
            PublicWire uses a five-step chain: Nimble finds civic source material,
            ClickHouse records the audit trail, the editorial agent makes the decision,
            Senso grounds the brief, and Datadog Lapdog traces the reliability layer.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-white/30 border border-white/30">
          {AGENTS.map((agent, idx) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: (idx % 5) * 0.04, ease: [0.22, 1, 0.36, 1] }}
              className="bg-black/60 backdrop-blur-sm p-6 md:p-7 group hover:bg-white hover:text-black transition-colors duration-500"
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[0.7rem] uppercase tracking-[0.18em] text-neutral-400 group-hover:text-neutral-600 transition-colors">
                  Step {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="text-[0.6rem] uppercase tracking-[0.15em] text-neutral-400 group-hover:text-neutral-600 transition-colors">
                  {agent.provider}
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-2">{agent.name}</h3>
              {agent.reviewer && (
                <span className="mb-3 inline-flex text-[0.6rem] uppercase tracking-[0.15em] px-1.5 py-0.5 bg-white text-black group-hover:bg-black group-hover:text-white transition-colors">
                  Reviewer
                </span>
              )}
              <p className="text-sm text-neutral-300 group-hover:text-neutral-700 transition-colors leading-relaxed">
                {agent.role}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

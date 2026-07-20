import { LenisProvider } from "@/components/landing/lenis-provider";
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { HowItWorks } from "@/components/landing/how-it-works";
import { AgentSwarm } from "@/components/landing/agent-swarm";
import { TrustLayer } from "@/components/landing/trust-layer";
import { Comparison } from "@/components/landing/comparison";
import { ClosingCTA } from "@/components/landing/closing-cta";
import { Colophon } from "@/components/landing/colophon";
import {
  landingShowcaseEnabled,
  publicCaseFilesEnabled,
} from "@/lib/public-wire-ui-flags";

export default function HomePage() {
  const showcase = landingShowcaseEnabled();
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date());
  return (
    <>
      <LenisProvider />
      <main>
        <Hero dateLabel={dateLabel} />
        {showcase && <AgentSwarm caseFilesEnabled={publicCaseFilesEnabled()} />}
        <Problem />
        <HowItWorks />
        {showcase && <TrustLayer />}
        <Comparison />
        <ClosingCTA />
        <Colophon landing showcase={showcase} />
      </main>
    </>
  );
}

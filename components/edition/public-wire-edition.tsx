"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, ExternalLink, Newspaper, SearchCheck, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type CivicBrief, type PublicWireEdition, getEditionBySlug } from "@/content/public-wire-content";

type Props = {
  areaSlug: string;
  areaName: string;
  focus: string[];
  initialQuery?: string;
  autoRun?: boolean;
};

type CoverageNotification = {
  title: string;
  message: string;
  requestedTopic: string;
};

export function PublicWireEdition({
  areaSlug,
  areaName,
  focus,
  initialQuery = "",
  autoRun = false,
}: Props) {
  const fallbackEdition = getEditionBySlug(areaSlug);
  const [edition, setEdition] = useState<PublicWireEdition>(fallbackEdition);
  const topBrief = edition.briefs[0] ?? fallbackEdition.briefs[0];
  const [selectedBrief, setSelectedBrief] = useState<CivicBrief | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [coverageNotification, setCoverageNotification] =
    useState<CoverageNotification | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const autoRunStarted = useRef(false);

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    await runLiveSponsorScan(query);
  }

  async function runLiveSponsorScan(requestedTopic?: string) {
    setLiveLoading(true);
    setLiveError(null);

    try {
      const response = await fetch("/api/public-wire/edition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          area: areaName || edition.area,
          slug: areaSlug,
          focus,
          requestedTopic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Live scan failed");
      }

      setEdition(data.edition);
      setLiveLoaded(true);
      if (requestedTopic) setCoverageNotification(null);
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : String(error));
    } finally {
      setLiveLoading(false);
    }
  }

  useEffect(() => {
    if (!autoRun || autoRunStarted.current) return;
    autoRunStarted.current = true;
    void runLiveSponsorScan(initialQuery.trim() || undefined);
  }, [autoRun, initialQuery]);

  return (
    <div className="bg-white text-black">
      <section className="border-b border-black/10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-16 md:pt-20 pb-12">
          <div className="flex items-baseline gap-3 mb-8 text-[0.7rem] md:text-xs uppercase tracking-[0.22em] text-neutral-500">
            <span>PublicWire {edition.area || areaName}</span>
            <span className="flex-1 h-px bg-black/15 max-w-[200px]" />
            <span>Live civic edition</span>
          </div>

          <div className="grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-14 items-end">
            <div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.92] tracking-tight mb-4 text-balance">
                Today&apos;s Civic Briefing
              </h1>
              <p className="text-base md:text-lg text-neutral-600 max-w-3xl">
                Last checked {edition.lastChecked} · {edition.metrics.sourcesMonitored} source
                surfaces scanned · {edition.metrics.meaningfulUpdates} meaningful updates ·{" "}
                {edition.metrics.routineItemsRejected} routine items filtered.
              </p>
            </div>

            <div className="border border-black/10 bg-neutral-50 p-5">
              <div className="text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500 mb-3">
                Edition queue
              </div>
              <ol className="space-y-3">
                {edition.briefs.map((brief, index) => (
                  <li key={brief.id} className="grid grid-cols-[58px_1fr] gap-3">
                    <div className="font-mono text-xs text-neutral-500">{brief.displayTime}</div>
                    <div>
                      <div className="flex flex-wrap gap-2 mb-1">
                        <span className="text-[0.58rem] uppercase tracking-[0.14em] px-1.5 py-0.5 bg-black text-white">
                          {index === 0 ? "Lead" : brief.sortLabel}
                        </span>
                        <span className="text-[0.58rem] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-black/20">
                          {brief.impactLabel}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-700 leading-relaxed">{brief.priorityReason}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {focus.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-[0.65rem] uppercase tracking-[0.22em] text-neutral-500">
                Focused on:
              </span>
              {focus.map((f) => (
                <span
                  key={f}
                  className="text-[0.65rem] uppercase tracking-[0.15em] px-2 py-1 border border-black/20"
                >
                  {f.replace(/-/g, " ")}
                </span>
              ))}
            </div>
          )}

          <form onSubmit={runSearch} className="mt-8 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full border border-black/20 bg-white px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="Search any local topic or claim, like brown water near Washington Street or overnight parking rule change"
            />
            <button
              type="submit"
              disabled={liveLoading || !searchQuery.trim()}
              className="btn-solid-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SearchCheck className="size-4" />
              Search source trail
            </button>
          </form>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => runLiveSponsorScan()}
              disabled={liveLoading}
              className="btn-solid-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SearchCheck className="size-4" />
              {liveLoading ? "Running live scan..." : liveLoaded ? "Rerun live sponsor scan" : "Run live sponsor scan"}
            </button>
            <button type="button" onClick={() => setSelectedBrief(topBrief)} className="btn-outline-dark">
              <SearchCheck className="size-4" /> Investigate top brief
            </button>
            <button type="button" onClick={() => setRequestOpen(true)} className="btn-outline-dark">
              <Send className="size-4" /> News you want to see
            </button>
            <Link href={`/briefs/${topBrief.slug}`} className="btn-outline-dark">
              <Newspaper className="size-4" /> Open top brief
            </Link>
          {liveError && (
            <div className="mt-4 border border-red-500 bg-red-50 p-3 text-sm text-red-700">
              Live scan failed. Showing fallback edition. {liveError}
            </div>
          )}

          {coverageNotification && (
            <div className="mt-4 border border-blue-600 bg-blue-50 p-4 text-sm text-blue-900">
              <div className="font-bold">{coverageNotification.title}</div>
              <p className="mt-1">{coverageNotification.message}</p>
              <button
                type="button"
                onClick={() => runLiveSponsorScan(coverageNotification.requestedTopic)}
                className="mt-3 inline-flex items-center gap-2 border border-blue-700 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em]"
              >
                Refresh live feed with requested topic
              </button>
            </div>
          )}

          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-black text-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/15 border border-white/15">
          <Metric value={edition.metrics.sourcesMonitored} label="Source surfaces" />
          <Metric value={edition.metrics.meaningfulUpdates} label="Meaningful updates" />
          <Metric value={edition.metrics.routineItemsRejected} label="Routine filtered" />
          <Metric value={edition.metrics.civicLayers} label="Civic layers" />
        </div>
      </section>

      <section className="border-b border-black/10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16">
          <SectionLabel label="Top story" />

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-px bg-black/10 border border-black/10">
            <article className="bg-white p-8 md:p-12">
              <BriefKicker
                verificationStatus={topBrief.verificationStatus}
                category={topBrief.category}
                status={topBrief.status}
              />
              <h2 className="text-3xl md:text-5xl font-bold leading-[1.02] tracking-tight mb-6 text-balance">
                {topBrief.headline}
              </h2>
              <p className="text-lg md:text-xl text-neutral-700 leading-relaxed mb-6 font-light">
                {topBrief.summary}
              </p>

              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <DetailBlock title="Why it matters" body={topBrief.whyItMatters} />
                <DetailBlock title="Who is affected" body={topBrief.whoIsAffected.join(" · ")} />
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/briefs/${fallbackEdition.briefs[0].slug}`} className="btn-solid-dark">
                  Read full trust layer <ArrowUpRight className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedBrief(topBrief)}
                  className="btn-outline-dark"
                >
                  <SearchCheck className="size-4" /> Investigate agent work
                </button>
              </div>
            </article>

            <aside className="bg-black text-white p-8 md:p-10">
              <div className="text-[0.7rem] uppercase tracking-[0.22em] text-neutral-400 mb-4">
                Agent audit log
              </div>
              <ol className="space-y-3">
                {topBrief.auditLog.slice(0, 6).map((line, i) => (
                  <li key={line} className="flex gap-3 text-sm text-neutral-200 leading-relaxed">
                    <span className="text-xs text-neutral-500 shrink-0 pt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-8 pt-6 border-t border-white/15">
                <div className="text-[0.7rem] uppercase tracking-[0.22em] text-neutral-400 mb-2">
                  Reliability review
                </div>
                <p className="text-sm text-neutral-200 leading-relaxed">{topBrief.reliabilityReview}</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-neutral-50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 grid lg:grid-cols-[1.3fr_1fr] gap-10">
          <div>
            <SectionLabel label="Also today" />
            <div className="space-y-4">
              {edition.briefs.map((brief) => (
                <article key={brief.id} className="bg-white border border-black/10 p-5">
                  <BriefKicker
                    verificationStatus={brief.verificationStatus}
                    category={brief.category}
                    status={brief.status}
                  />
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.15em] text-neutral-500">
                    <span>{brief.displayTime}</span>
                    <span className="h-px w-6 bg-black/20" />
                    <span>{brief.sortLabel}</span>
                    <span className="h-px w-6 bg-black/20" />
                    <span>{brief.impactLabel}</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold leading-tight mb-2">
                    <Link href={`/briefs/${brief.slug}`} className="hover:underline">
                      {brief.headline}
                    </Link>
                  </h3>
                  <p className="text-sm text-neutral-700 mb-1">
                    <strong>What changed: </strong>
                    {brief.whatChanged}
                  </p>
                  <p className="text-sm text-neutral-700">
                    <strong>Why it matters: </strong>
                    {brief.whyItMatters}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedBrief(brief)}
                      className="btn-outline-dark"
                    >
                      <SearchCheck className="size-4" /> Investigate
                    </button>
                    <Link href={`/briefs/${brief.slug}`} className="btn-solid-dark">
                      Open brief <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside>
            <SectionLabel label="Filtered & requested" compact />
            <div className="mb-4 border border-black bg-white p-4">
              <div className="text-[0.65rem] uppercase tracking-[0.18em] text-neutral-500 mb-2">
                Want something covered?
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed mb-4">
                Submit a topic and the agents check whether it can be covered with public,
                source-backed evidence. Repeated requests raise priority, but unsupported
                claims still do not publish.
              </p>
              <button type="button" onClick={() => setRequestOpen(true)} className="btn-solid-dark">
                <Send className="size-4" /> Request coverage
              </button>
            </div>
            <div className="space-y-3">
              {edition.rejectedItems.map((item) => (
                <div key={item.title} className="bg-white border border-black/10 p-4">
                  <div className="text-sm font-medium mb-1">{item.title}</div>
                  <div className="text-[0.65rem] uppercase tracking-[0.15em] text-neutral-500 mb-2">
                    {item.source}
                  </div>
                  <p className="text-xs text-neutral-500">{item.reason}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-black/10 bg-neutral-50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16">
          <div>
            <SectionLabel label="Representative source families" compact />
            <p className="mb-6 max-w-3xl text-sm leading-relaxed text-neutral-600">
              The scanner counts individual source surfaces: pages, agendas, PDF indexes,
              alert feeds, calendars, and notice boards. These cards show the main source
              families behind that larger scan.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {edition.sources.map((source) => (
                <div key={source.id} className="bg-white border border-black/10 p-4">
                  <div className="font-medium">{source.name}</div>
                  <div className="text-[0.65rem] uppercase tracking-[0.15em] text-neutral-500 mt-1">
                    {source.level} · {source.category} · {source.sourceType}
                  </div>
                  <div className="text-xs text-neutral-500 truncate mt-1">{source.url}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
          End of edition · {areaSlug} · live sponsor scan enabled
        </p>
      </section>

      <InvestigationDialog brief={selectedBrief} onOpenChange={(open) => !open && setSelectedBrief(null)} />
      <CoverageRequestDialog
        area={edition.area}
        areaSlug={areaSlug}
        open={requestOpen}
        submitted={requestSubmitted}
        onSubmit={(notification) => {
          setRequestSubmitted(true);
          if (notification) setCoverageNotification(notification);
        }}
        onOpenChange={(open) => {
          setRequestOpen(open);
          if (!open) setRequestSubmitted(false);
        }}
      />
    </div>
  );
}

function CoverageRequestDialog({
  area,
  areaSlug,
  open,
  submitted,
  onSubmit,
  onOpenChange,
}: {
  area: string;
  areaSlug: string;
  open: boolean;
  submitted: boolean;
  onSubmit: (notification: CoverageNotification | null) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [topic, setTopic] = useState("");
  const [sourceHint, setSourceHint] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState<number | null>(null);
  const [requestScore, setRequestScore] = useState<number | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  async function queueCoverageRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestLoading(true);
    setRequestError(null);

    try {
      const response = await fetch("/api/public-wire/coverage-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          area,
          slug: areaSlug,
          topic,
          sourceHint,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || data?.detail || "Request failed");
      }

      setRequestCount(data.record?.count ?? null);
      setRequestScore(data.record?.score ?? null);
      onSubmit(data.notification ?? null);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : String(error));
    } finally {
      setRequestLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border-black bg-white text-black sm:max-w-[720px]">
        <DialogHeader>
          <div className="text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500">
            News you want to see
          </div>
          <DialogTitle className="text-3xl md:text-4xl font-bold tracking-tight">
            Ask the {area} desk to investigate a topic.
          </DialogTitle>
          <DialogDescription className="text-base text-neutral-600">
            Reader demand can focus the agents, but publication still depends on
            official or public source support.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="border border-black bg-neutral-50 p-5">
            <div className="text-[0.65rem] uppercase tracking-[0.18em] text-neutral-500 mb-2">
              Request queued
            </div>
            <p className="text-sm text-neutral-800 leading-relaxed">
              The topic was queued for demand scoring. Repeated similar requests can trigger
              a source-backed investigation, but the system still separates popular claims
              from supported claims before publishing.
            </p>
            {requestCount !== null && (
              <p className="mt-3 text-sm text-neutral-700">
                Demand count: <strong>{requestCount}</strong> · Score:{" "}
                <strong>{requestScore}</strong>
              </p>
            )}
          </div>
        ) : (
          <form className="space-y-4" onSubmit={queueCoverageRequest}>
            <label className="block">
              <span className="mb-2 block text-[0.65rem] uppercase tracking-[0.18em] text-neutral-500">
                Topic or claim
              </span>
              <textarea
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="min-h-28 w-full border border-black/20 bg-white p-3 text-sm outline-none focus:border-black"
                placeholder="Example: Is there a water main break near Washington Street causing brown water?"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[0.65rem] uppercase tracking-[0.18em] text-neutral-500">
                Optional source or place to check
              </span>
              <input
                value={sourceHint}
                onChange={(event) => setSourceHint(event.target.value)}
                className="w-full border border-black/20 bg-white p-3 text-sm outline-none focus:border-black"
                placeholder="Agency page, agenda, PDF, public post, address, or source name"
              />
            </label>
            <div className="grid gap-3 border border-black/10 bg-neutral-50 p-4 text-sm text-neutral-700 md:grid-cols-3">
              <div>
                <strong className="block text-black">1. Source scout</strong>
                Looks for official or public evidence.
              </div>
              <div>
                <strong className="block text-black">2. Volume check</strong>
                Repeated requests raise priority.
              </div>
              <div>
                <strong className="block text-black">3. Publish test</strong>
                No source support means no brief.
              </div>
            </div>
            {requestError && (
              <div className="border border-red-500 bg-red-50 p-3 text-sm text-red-700">
                {requestError}
              </div>
            )}

            <button
              type="submit"
              disabled={requestLoading}
              className="btn-solid-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="size-4" />
              {requestLoading ? "Queuing..." : "Queue topic check"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvestigationDialog({
  brief,
  onOpenChange,
}: {
  brief: CivicBrief | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(brief)} onOpenChange={onOpenChange}>
      <DialogContent
        data-lenis-prevent=""
        data-lenis-prevent-touch=""
        data-lenis-prevent-wheel=""
        className="!flex h-[90dvh] max-h-[90dvh] min-h-0 !flex-col !gap-0 overflow-hidden rounded-none border-black bg-white !p-0 text-black sm:!max-w-[1040px]"
      >
        {brief && (
          <>
            <DialogHeader className="shrink-0 border-b border-black/10 p-6 pr-12 md:p-8 md:pr-14">
              <div className="text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500">
                Agent console · reader investigation
              </div>
              <DialogTitle className="text-3xl md:text-5xl font-bold tracking-tight leading-[1] max-w-3xl">
                {brief.headline}
              </DialogTitle>
              <DialogDescription className="text-base text-neutral-600 max-w-2xl">
                Opened because a reader wanted to inspect how this entry was sourced,
                verified, reviewed, and published.
              </DialogDescription>
            </DialogHeader>

            <div
              data-lenis-prevent=""
              data-lenis-prevent-touch=""
              data-lenis-prevent-wheel=""
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
            <div className="grid lg:grid-cols-[1.3fr_0.9fr] gap-px bg-black/10">
              <div className="bg-white p-6 md:p-8">
                <div className="text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500 mb-5">
                  Trace timeline
                </div>
                <ol className="space-y-3">
                  {brief.investigationTrace.map((event, i) => (
                    <li
                      key={`${i}-${event.time}-${event.agent}`}
                      className={`grid gap-3 border p-4 sm:grid-cols-[78px_150px_1fr] ${
                        event.status === "needs-evidence" || event.status === "resent"
                          ? "border-amber-500 bg-amber-50"
                          : "border-black/10 bg-white"
                      }`}
                    >
                      <span className="text-xs font-mono text-neutral-500">{event.time}</span>
                      <span className="text-sm font-bold">{event.agent}</span>
                      <span className="text-sm text-neutral-700 leading-relaxed">
                        <span
                          className={`mr-2 inline-flex px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] ${
                            event.status === "needs-evidence" || event.status === "resent"
                              ? "bg-amber-500 text-black"
                              : event.status === "published"
                                ? "bg-black text-white"
                                : "border border-black/20 text-black"
                          }`}
                        >
                          {event.status === "resent" ? "↩ resend" : event.status.replace("-", " ")}
                        </span>
                        {event.detail}
                        {event.query && (
                          <span className="mt-3 block border-l border-black/20 pl-3 italic text-neutral-500">
                            “{event.query}”
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <aside className="bg-black p-6 md:p-8 text-white">
                <div className="text-[0.65rem] uppercase tracking-[0.2em] text-neutral-400 mb-5">
                  Evidence packet
                </div>
                <div className="space-y-4">
                  {brief.sources.map((source) => (
                    <div key={source.title} className="border border-white/15 p-4">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold hover:underline"
                      >
                        {source.title} <ExternalLink className="size-4" />
                      </a>
                      <p className="mt-2 text-xs leading-relaxed text-neutral-400">{source.role}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 border-t border-white/15 pt-6">
                  <div className="text-[0.65rem] uppercase tracking-[0.2em] text-neutral-400 mb-3">
                    Reliability review
                  </div>
                  <p className="text-sm leading-relaxed text-neutral-200">{brief.reliabilityReview}</p>
                </div>

                <div className="mt-8 border-t border-white/15 pt-6">
                  <div className="text-[0.65rem] uppercase tracking-[0.2em] text-neutral-400 mb-3">
                    Public artifact
                  </div>
                  <p className="text-sm text-neutral-200">{brief.artifactLabel}</p>
                  {brief.publishedUrl && (
                    <a
                      href={brief.publishedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] border border-white/30 px-3 py-2 hover:bg-white hover:text-black transition-colors"
                    >
                      View on cited.md <ExternalLink className="size-4" />
                    </a>
                  )}
                </div>

                <div className="mt-8 border-t border-white/15 pt-6">
                  <div className="text-[0.65rem] uppercase tracking-[0.2em] text-neutral-400 mb-3">
                    Technical scoring
                  </div>
                  <div className="space-y-2">
                    {brief.investigationTrace
                      .filter((event) => event.technicalConfidence)
                      .map((event, i) => (
                        <p key={`${i}-${event.time}-${event.technicalConfidence}`} className="text-xs text-neutral-300">
                          {event.agent}: {event.technicalConfidence}
                        </p>
                      ))}
                  </div>
                </div>
              </aside>
            </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SectionLabel({ label, compact = false, dark = false }: { label: string; compact?: boolean; dark?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${compact ? "mb-6" : "mb-10"}`}>
      <span className={`text-xs uppercase tracking-[0.22em] ${dark ? "text-neutral-400" : "text-neutral-500"}`}>
        {label}
      </span>
      <span className={`flex-1 h-px max-w-[200px] ${dark ? "bg-white/15" : "bg-black/15"}`} />
    </div>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-black p-4">
      <div className="text-3xl md:text-4xl font-bold">{value}</div>
      <div className="text-[0.65rem] uppercase tracking-[0.18em] text-neutral-400 mt-1">
        {label}
      </div>
    </div>
  );
}

function BriefKicker({
  verificationStatus,
  category,
  status,
}: {
  verificationStatus: string;
  category: string;
  status: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      <span className="text-[0.65rem] uppercase tracking-[0.15em] px-2 py-1 bg-black text-white">
        {verificationStatus}
      </span>
      <span className="text-[0.65rem] uppercase tracking-[0.15em] px-2 py-1 border border-black/20">
        {category}
      </span>
      <span className="text-[0.65rem] uppercase tracking-[0.15em] px-2 py-1 border border-black/20">
        {status}
      </span>
    </div>
  );
}

function DetailBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-black/15 pt-3">
      <div className="text-[0.65rem] uppercase tracking-[0.18em] text-neutral-500 mb-1">
        {title}
      </div>
      <p className="text-sm text-neutral-800">{body}</p>
    </div>
  );
}

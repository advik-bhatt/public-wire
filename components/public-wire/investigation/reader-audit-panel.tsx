"use client";

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  History,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { PublicInvestigationDetail } from "@/lib/public-wire-view-models/schemas";
import {
  buildReaderAuditAnswers,
  matchReaderAuditQuestion,
  readerAuditQuestions,
  type ReaderAuditQuestionId,
} from "@/lib/public-wire-view-models/reader-audit";

const icons = {
  support: ShieldCheck,
  agents: Sparkles,
  change: History,
  impact: ArrowRight,
} as const;

export function ReaderAuditPanel({
  detail,
}: {
  detail: PublicInvestigationDetail;
}) {
  const reduceMotion = useReducedMotion();
  const answers = useMemo(() => buildReaderAuditAnswers(detail), [detail]);
  const [selectedId, setSelectedId] =
    useState<ReaderAuditQuestionId>("support");
  const [query, setQuery] = useState("");
  const selected = answers[selectedId];

  function answerQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim()) setSelectedId(matchReaderAuditQuestion(query));
  }

  function moveBetweenQuestions(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    const lastIndex = readerAuditQuestions.length - 1;
    const nextIndex =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? (currentIndex + 1) % readerAuditQuestions.length
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? (currentIndex - 1 + readerAuditQuestions.length) %
            readerAuditQuestions.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? lastIndex
              : undefined;
    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextId = readerAuditQuestions[nextIndex].id;
    setSelectedId(nextId);
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`#reader-audit-tab-${nextId}`)
      ?.focus();
  }

  return (
    <section className="reader-audit" aria-labelledby="reader-audit-heading">
      <div className="reader-audit-intro">
        <span className="eyebrow">Interrogate the record</span>
        <h2 id="reader-audit-heading">Start with your question</h2>
        <p>
          Move from the result to the exact claims, sources, agent catches, and
          revisions behind it.
        </p>
        <form className="reader-audit-form" onSubmit={answerQuestion}>
          <label htmlFor="reader-audit-query">Ask this case file</label>
          <div>
            <Search aria-hidden="true" />
            <input
              id="reader-audit-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What did the verifier catch?"
            />
            <button type="submit">Trace answer</button>
          </div>
          <small>Answers stay inside the disclosed case record.</small>
        </form>
      </div>

      <div className="reader-audit-console">
        <div
          className="reader-audit-tabs"
          role="tablist"
          aria-label="Case questions"
        >
          {readerAuditQuestions.map((question, index) => {
            const Icon = icons[question.id];
            return (
              <button
                key={question.id}
                type="button"
                role="tab"
                id={`reader-audit-tab-${question.id}`}
                aria-selected={selectedId === question.id}
                aria-controls="reader-audit-answer"
                tabIndex={selectedId === question.id ? 0 : -1}
                onClick={() => setSelectedId(question.id)}
                onKeyDown={(event) => moveBetweenQuestions(event, index)}
              >
                <Icon aria-hidden="true" />
                <span>
                  <strong>{question.label}</strong>
                  <small>{question.hint}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div
          id="reader-audit-answer"
          className="reader-audit-answer"
          role="tabpanel"
          aria-labelledby={`reader-audit-tab-${selected.id}`}
          aria-live="polite"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected.id}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.24 }}
            >
              <span className="eyebrow">{selected.eyebrow}</span>
              <h3>{selected.headline}</h3>
              <p>{selected.answer}</p>
              <dl>
                {selected.metrics.map((metric) => (
                  <div key={metric.label}>
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                  </div>
                ))}
              </dl>
              {(selected.claimKeys.length > 0 ||
                selected.sources.length > 0 ||
                selected.activityAnchor) && (
                <div className="reader-audit-links">
                  {selected.claimKeys.slice(0, 3).map((claimKey, index) => (
                    <a key={claimKey} href={`#claim-${claimKey}`}>
                      Inspect claim {index + 1}
                    </a>
                  ))}
                  {selected.sources.slice(0, 4).map((source) => (
                    <a
                      key={source.key}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      referrerPolicy="no-referrer"
                    >
                      {source.title} <ExternalLink aria-hidden="true" />
                    </a>
                  ))}
                  {selected.activityAnchor && (
                    <a href={selected.activityAnchor}>Open the audit trail</a>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

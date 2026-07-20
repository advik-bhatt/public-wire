"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchCheck } from "lucide-react";

export function CoverageForm({ areaKey }: { areaKey: string }) {
  const router = useRouter();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [topic, setTopic] = useState("");
  const [sourceHint, setSourceHint] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (topic.trim().length < 8) return;
    setState("submitting");
    setMessage("Queuing a source-backed check…");
    try {
      const response = await fetch("/api/public-wire/case-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
        },
        body: JSON.stringify({
          areaKey,
          topic: topic.trim(),
          sourceHint: sourceHint.trim() || undefined,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error?.message || "The desk could not queue this check.",
        );
      const caseKey = payload.job?.publicCaseKey;
      if (caseKey) {
        setMessage("Request queued. Opening your case file.");
        router.push(`/local/${areaKey}/investigations/${caseKey}`);
      } else {
        setMessage(
          "Request queued. A private case link is not available in this browser.",
        );
        setState("idle");
      }
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The desk could not queue this check.",
      );
    }
  }

  return (
    <form className="coverage-form" onSubmit={submit}>
      <label>
        <span>What should the desk check?</span>
        <textarea
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Describe a local change or claim. Demand guides attention; it does not determine truth."
          required
          minLength={8}
          maxLength={240}
        />
      </label>
      <label>
        <span>Optional source or place</span>
        <input
          value={sourceHint}
          onChange={(event) => setSourceHint(event.target.value)}
          placeholder="Agency page, public notice, address, or source name"
          maxLength={240}
        />
      </label>
      <button
        className="btn-solid-dark"
        type="submit"
        disabled={state === "submitting" || topic.trim().length < 8}
      >
        <SearchCheck className="size-4" />
        {state === "submitting" ? "Queuing…" : "Open a source check"}
      </button>
      <p
        className={
          state === "error" ? "form-message form-error" : "form-message"
        }
        aria-live="polite"
      >
        {message}
      </p>
    </form>
  );
}

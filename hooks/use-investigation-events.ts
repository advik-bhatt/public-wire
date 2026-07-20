"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  publicInvestigationEventSchema,
  type PublicInvestigationEvent,
} from "@/lib/public-wire-view-models/schemas";

export function useInvestigationEvents(params: {
  endpoint?: string;
  initial: PublicInvestigationEvent[];
  projectionRevision: number;
  snapshotCursor: number;
  streamEpoch: string;
}) {
  const router = useRouter();
  const [events, setEvents] = useState(params.initial);
  const [connection, setConnection] = useState<
    "static" | "connecting" | "live" | "delayed"
  >(params.endpoint ? "connecting" : "static");
  const cursor = useRef(params.snapshotCursor);
  const known = useRef(
    new Set(params.initial.map((event) => event.publicEventKey)),
  );
  const projectionRevision = useRef(params.projectionRevision);

  useEffect(() => {
    if (!params.endpoint) return;
    let disposed = false;
    let failures = 0;
    let source: EventSource | undefined;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;

    const append = (candidate: unknown) => {
      const parsed = publicInvestigationEventSchema.safeParse(candidate);
      if (
        !parsed.success ||
        known.current.has(parsed.data.publicEventKey) ||
        parsed.data.cursor <= cursor.current
      )
        return;
      known.current.add(parsed.data.publicEventKey);
      cursor.current = parsed.data.cursor;
      setEvents((current) => [...current, parsed.data].slice(-100));
      router.refresh();
    };

    const poll = async () => {
      if (disposed) return;
      try {
        const response = await fetch(
          `${params.endpoint}?after=${cursor.current}&epoch=${encodeURIComponent(params.streamEpoch)}&transport=poll`,
          { cache: "no-store" },
        );
        if (response.status === 409 || response.status === 410) {
          window.location.reload();
          return;
        }
        if (!response.ok) throw new Error("poll failed");
        const payload = await response.json();
        for (const event of payload.events ?? []) append(event);
        if (Number(payload.projectionRevision) > projectionRevision.current) {
          projectionRevision.current = Number(payload.projectionRevision);
          router.refresh();
        }
        setConnection("live");
      } catch {
        setConnection("delayed");
      } finally {
        pollTimer = setTimeout(poll, 5_000);
      }
    };

    const connect = () => {
      source = new EventSource(
        `${params.endpoint}?after=${cursor.current}&epoch=${encodeURIComponent(params.streamEpoch)}`,
      );
      source.addEventListener("open", () => {
        failures = 0;
        setConnection("live");
      });
      source.addEventListener("investigation", (message) => {
        try {
          append(JSON.parse((message as MessageEvent).data));
        } catch {
          /* invalid public events are ignored */
        }
      });
      source.addEventListener("reset", () => window.location.reload());
      source.addEventListener("error", () => {
        failures += 1;
        setConnection("delayed");
        if (failures >= 2) {
          source?.close();
          void poll();
        }
      });
    };
    connect();
    return () => {
      disposed = true;
      source?.close();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [params.endpoint, params.streamEpoch, router]);

  return { events, connection };
}

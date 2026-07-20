"use client";

import type { PublicInvestigationDetail } from "@/lib/public-wire-view-models/schemas";
import {
  absoluteTime,
  eventCopy,
} from "@/lib/public-wire-view-models/state-labels";
import { useInvestigationEvents } from "@/hooks/use-investigation-events";

export function ActivityStream({
  detail,
  endpoint,
}: {
  detail: PublicInvestigationDetail;
  endpoint?: string;
}) {
  const { events, connection } = useInvestigationEvents({
    endpoint,
    initial: detail.events,
    projectionRevision: detail.projectionRevision,
    snapshotCursor: detail.snapshotCursor,
    streamEpoch: detail.streamEpoch,
  });
  return (
    <section aria-labelledby="activity-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {detail.summary.runtimeMode === "demo"
              ? "Reference activity"
              : "Public activity"}
          </span>
          <h2 id="activity-heading">
            {detail.summary.runtimeMode === "demo"
              ? "Scenario event projection"
              : "What the desk did"}
          </h2>
        </div>
        <span className="connection-label">
          {detail.summary.runtimeMode === "demo"
            ? "Contract fixture"
            : connection === "live"
              ? "Updates connected"
              : connection === "delayed"
                ? "Updates delayed"
                : "Persisted record"}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {events.length
          ? `Latest activity: ${eventCopy(events.at(-1)!)} `
          : "No public activity yet."}
      </p>
      <ol className="event-list">
        {events.map((event) => (
          <li key={event.publicEventKey}>
            <time dateTime={event.occurredAt}>
              {absoluteTime(event.occurredAt)}
            </time>
            <div>
              <span className="event-stage">{event.stage}</span>
              <p>{eventCopy(event)}</p>
            </div>
          </li>
        ))}
      </ol>
      {!events.length && (
        <div className="empty-state">
          <strong>No public activity yet.</strong>
          <p>
            The current snapshot remains readable without a live connection.
          </p>
        </div>
      )}
    </section>
  );
}

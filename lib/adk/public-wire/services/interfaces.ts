import type { Part } from "@google/genai";
import type {
  EvidenceMatrix,
  PublicWireEventEnvelope,
  ReviewerResult,
  SourceArtifact,
  WorkflowDecision,
} from "../contracts";
import type {
  PublicInvestigationDetail,
  PublicJobView,
} from "@/lib/public-wire-view-models/schemas";
import type { CivicBrief } from "@/lib/public-wire-data";

export type InvocationIdentity = {
  investigationId: string;
  jobId: string;
  jobAttemptId: string;
  areaKey: string;
  requestedRevision: number;
  leaseToken: string;
  operation?: "scan" | "source_refresh";
  sourceWatchId?: string;
  adkSessionId?: string;
  resumeRevision?: boolean;
};

export type TrajectorySpan = {
  executionSpanId: string;
  investigationId: string;
  revision: number;
  jobAttemptId: string;
  invocationId: string;
  parentSpanId?: string;
  spanKind: "run" | "agent" | "model" | "tool" | "policy" | "persistence";
  name: string;
  outcome: "started" | "succeeded" | "failed" | "cancelled";
  startedAt: string;
  endedAt?: string;
  latencyMs?: number;
  model?: string;
  inputHash?: string;
  outputHash?: string;
  safeAttributes: Record<string, string | number | boolean>;
  leaseToken: string;
};

export interface TrajectorySpanSink {
  appendSpan(span: TrajectorySpan): Promise<void>;
}

export interface ArtifactService {
  save(params: {
    userId: string;
    sessionId: string;
    filename: string;
    artifact: Part;
    metadata: SourceArtifact;
  }): Promise<number>;
  load(params: {
    userId: string;
    sessionId: string;
    filename: string;
    version?: number;
  }): Promise<Part | undefined>;
}

export interface EventSink extends TrajectorySpanSink {
  append(event: PublicWireEventEnvelope): Promise<void>;
  reconcile(
    identity: InvocationIdentity,
    expectedAdkEventIds?: string[],
  ): Promise<void>;
}

export interface InvestigationRepository {
  loadForMutation(
    investigationId: string,
    expectedRevision: number,
    jobAttemptId: string,
    leaseToken: string,
  ): Promise<{ revision: number; leaseToken: string } | undefined>;
  persistEvidence(
    investigationId: string,
    expectedRevision: number,
    jobAttemptId: string,
    leaseToken: string,
    matrix: EvidenceMatrix,
    decision: WorkflowDecision,
  ): Promise<void>;
  persistReviews(
    investigationId: string,
    expectedRevision: number,
    jobAttemptId: string,
    leaseToken: string,
    reviews: ReviewerResult[],
  ): Promise<void>;
  persistFinalGate(params: {
    investigationId: string;
    revision: number;
    jobAttemptId: string;
    leaseToken: string;
    contentHash: string;
    passed: boolean;
    reasonCodes: string[];
    event: PublicWireEventEnvelope;
  }): Promise<void>;
  getPublicProjection(
    publicCaseKey: string,
    requesterScopeHash?: string,
  ): Promise<PublicInvestigationDetail | undefined>;
}

export interface JobRepository {
  createOrReuse(params: {
    areaKey: string;
    topic: string;
    sourceHint?: string;
    requesterScopeHash: string;
    idempotencyKey: string;
    runtimeMode?: "real" | "shadow";
    admissionLimit?: number;
    areaAdmissionLimit?: number;
  }): Promise<PublicJobView>;
  claimNext(
    workerId: string,
    leaseMs: number,
  ): Promise<InvocationIdentity | undefined>;
  bindInvocation(
    jobAttemptId: string,
    leaseToken: string,
    invocationId: string,
  ): Promise<void>;
  heartbeat(
    jobAttemptId: string,
    leaseToken: string,
    leaseMs: number,
  ): Promise<boolean>;
  complete(
    jobAttemptId: string,
    leaseToken: string,
    outcome: "complete" | "failed" | "cancelled",
    errorCode?: string,
  ): Promise<"completed" | "retried" | "terminal" | "lost">;
  enqueueSourceRefresh(params: {
    investigationId: string;
    sourceWatchId: string;
    expectedRevision: number;
    requesterScopeHash: string;
    idempotencyKey: string;
  }): Promise<PublicJobView>;
}

export interface RuntimeControlService {
  get(): Promise<{
    mode: "legacy" | "shadow" | "adk";
    publicationBlocked: boolean;
    shadowSampleRate: number;
    version: number;
    freshUntil: string;
  }>;
}

export interface AdmissionService {
  admit(params: {
    areaKey: string;
    requesterScopeHash: string;
    operation: "case-request" | "shadow-run";
  }): Promise<{ admitted: boolean; retryAfterSeconds?: number }>;
}

export interface PublicationService {
  publish(params: {
    investigationId: string;
    jobAttemptId: string;
    leaseToken: string;
    revision: number;
    contentHash: string;
    reviewedDraftHash: string;
    brief: CivicBrief;
    signal?: AbortSignal;
  }): Promise<{
    state: "confirmed" | "unknown" | "failed";
    providerId?: string;
    providerUrl?: string;
  }>;
}

export class ShadowPublicationService implements PublicationService {
  async publish(): Promise<never> {
    throw new Error("Publication capability is unavailable in shadow mode");
  }
}

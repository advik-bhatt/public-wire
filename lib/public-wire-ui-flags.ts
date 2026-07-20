import "server-only";
import { PostgresRuntimeControlService } from "@/lib/investigations/runtime-controls";

export function publicCaseFilesEnabled() {
  return process.env.PUBLIC_WIRE_UI_CASE_FILES !== "false";
}

export async function publicCaseRequestsEnabled() {
  if (!publicCaseFilesEnabled()) return false;
  try {
    return (await new PostgresRuntimeControlService().get(true)).mode === "adk";
  } catch {
    return false;
  }
}

export function liveCaseEventsEnabled() {
  return (
    publicCaseFilesEnabled() &&
    process.env.PUBLIC_WIRE_UI_LIVE_EVENTS === "true"
  );
}

export function claimReceiptsEnabled() {
  return (
    publicCaseFilesEnabled() &&
    process.env.PUBLIC_WIRE_UI_CLAIM_RECEIPTS !== "false"
  );
}

export function briefProvenanceEnabled() {
  return process.env.PUBLIC_WIRE_UI_BRIEF_PROVENANCE !== "false";
}

export function landingShowcaseEnabled() {
  return process.env.PUBLIC_WIRE_UI_LANDING_SHOWCASE !== "false";
}

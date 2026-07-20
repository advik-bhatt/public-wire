import type { ReferenceRun } from "@/lib/public-wire-view-models/reference-run-schema";

export type RunIntelligence = NonNullable<ReferenceRun["intelligence"]>;
export type MomentContribution = NonNullable<
  ReferenceRun["story"]["moments"][number]["contribution"]
>;

export function getRunIntelligence(
  run: ReferenceRun,
): RunIntelligence | undefined {
  return run.intelligence;
}

export function getMomentContribution(
  moment: ReferenceRun["story"]["moments"][number],
): MomentContribution | undefined {
  return moment.contribution;
}

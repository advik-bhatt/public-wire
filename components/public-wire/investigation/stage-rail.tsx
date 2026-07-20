import type { PublicInvestigationDetail } from "@/lib/public-wire-view-models/schemas";

export function StageRail({
  stages,
}: {
  stages: PublicInvestigationDetail["stageRail"];
}) {
  return (
    <ol className="stage-rail" aria-label="Investigation stages">
      {stages.map((stage, index) => (
        <li key={stage.stage} data-state={stage.state}>
          <span className="stage-index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>{stage.label}</span>
          <span className="stage-state">{stage.state}</span>
        </li>
      ))}
    </ol>
  );
}

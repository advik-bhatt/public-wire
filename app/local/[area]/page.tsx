import { notFound } from "next/navigation";
import { Masthead } from "@/components/landing/masthead";
import { Colophon } from "@/components/landing/colophon";
import { PublicWireEdition } from "@/components/edition/public-wire-edition";
import { resolveArea } from "@/lib/areas/registry";
import { getEditionProjection } from "@/lib/investigations/public-projections";
import {
  publicCaseFilesEnabled,
  publicCaseRequestsEnabled,
} from "@/lib/public-wire-ui-flags";
import { referenceRuns } from "@/lib/public-wire-view-models/fixtures";

type Props = { params: Promise<{ area: string }> };

export async function generateMetadata({ params }: Props) {
  const { area: areaKey } = await params;
  const area = resolveArea(areaKey);
  if (!area)
    return {
      title: "Edition not found · PublicWire",
      robots: { index: false },
    };
  const edition = await getEditionProjection(areaKey);
  if (!edition || edition.runtimeMode !== "real") {
    return {
      title: `${area.displayName} reference edition · PublicWire`,
      description: `Contract-valid Google ADK workflow scenarios and evidence views for ${area.displayName}.`,
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${area.displayName} civic edition · PublicWire`,
    description: `Confirmed civic briefs and disclosed source-backed investigations for ${area.displayName}.`,
    robots: { index: true, follow: true },
  };
}

export default async function AreaPage({ params }: Props) {
  const { area: areaKey } = await params;
  if (!resolveArea(areaKey)) notFound();
  const edition = await getEditionProjection(areaKey);
  if (!edition) notFound();
  const editionReferenceRuns =
    edition.runtimeMode === "demo"
      ? referenceRuns.filter((run) => run.detail.summary.areaKey === areaKey)
      : undefined;
  return (
    <>
      <Masthead variant="solid" />
      <PublicWireEdition
        edition={edition}
        referenceRuns={editionReferenceRuns}
        caseFilesEnabled={publicCaseFilesEnabled()}
        caseRequestsEnabled={await publicCaseRequestsEnabled()}
      />
      <Colophon />
    </>
  );
}

import { z } from "zod";

const areaSchema = z
  .object({
    areaKey: z.string().regex(/^[a-z0-9-]+$/),
    displayName: z.string().min(2).max(120),
    timeZone: z.string().min(3).max(80),
    enabled: z.boolean(),
    allowedSourceHosts: z.array(z.string()).min(1),
    officialSourceHosts: z.array(z.string()),
  })
  .strict();

export type AreaRecord = z.infer<typeof areaSchema>;

const AREAS = areaSchema.array().parse([
  {
    areaKey: "new-brunswick",
    displayName: "New Brunswick, NJ",
    timeZone: "America/New_York",
    enabled: true,
    allowedSourceHosts: [
      "cityofnewbrunswick.org",
      "www.cityofnewbrunswick.org",
      "njtransit.com",
      "www.njtransit.com",
      "rutgers.edu",
      "www.rutgers.edu",
      "middlesexcountynj.gov",
      "www.middlesexcountynj.gov",
    ],
    officialSourceHosts: [
      "cityofnewbrunswick.org",
      "www.cityofnewbrunswick.org",
      "njtransit.com",
      "www.njtransit.com",
      "rutgers.edu",
      "www.rutgers.edu",
      "middlesexcountynj.gov",
      "www.middlesexcountynj.gov",
    ],
  },
  {
    areaKey: "new-york-city",
    displayName: "New York City, NY",
    timeZone: "America/New_York",
    enabled: true,
    allowedSourceHosts: [
      "nyc.gov",
      "www.nyc.gov",
      "portal.311.nyc.gov",
      "mta.info",
      "www.mta.info",
    ],
    officialSourceHosts: [
      "nyc.gov",
      "www.nyc.gov",
      "portal.311.nyc.gov",
      "mta.info",
      "www.mta.info",
    ],
  },
]);

export function listEnabledAreas() {
  return AREAS.filter((area) => area.enabled);
}

export function resolveArea(areaKey: string) {
  return AREAS.find((area) => area.areaKey === areaKey && area.enabled);
}

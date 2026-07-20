import { absoluteTime } from "@/lib/public-wire-view-models/state-labels";

export function Timestamp({
  value,
  label,
  timeZone = "America/New_York",
}: {
  value: string;
  label?: string;
  timeZone?: string;
}) {
  const absolute = absoluteTime(value, timeZone);
  return (
    <time dateTime={value} title={absolute}>
      {label ? `${label} ${absolute}` : absolute}
    </time>
  );
}

export function DegradedBanner({
  message,
  reference = false,
}: {
  message: string;
  reference?: boolean;
}) {
  return (
    <aside
      className={reference ? "reference-banner" : "degraded-banner"}
      role="status"
    >
      <strong>{reference ? "Captured record" : "Desk status"}</strong>
      <span>{message}</span>
    </aside>
  );
}

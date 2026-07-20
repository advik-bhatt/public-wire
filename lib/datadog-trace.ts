import tracer from "dd-trace";

export async function traceStep<T>(
  name: string,
  tags: Record<string, string | number | boolean | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.trace(name, async (span) => {
    for (const [key, value] of Object.entries(tags)) {
      if (value !== undefined) span.setTag(key, value);
    }

    try {
      const result = await fn();
      span.setTag("public_wire.status", "ok");
      return result;
    } catch (error) {
      span.setTag("public_wire.status", "error");
      span.setTag(
        "error",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  });
}

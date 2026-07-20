import { describe, expect, it } from "vitest";
import { assertSafePublicUrl } from "@/lib/adk/public-wire/plugins/source-safety";

describe("source URL policy", () => {
  it("accepts an allowlisted public HTTPS URL", () => {
    expect(
      assertSafePublicUrl("https://example.gov/notices", ["example.gov"])
        .hostname,
    ).toBe("example.gov");
  });

  it.each([
    "http://example.gov",
    "https://localhost/a",
    "https://127.0.0.1/a",
    "https://[::1]/a",
    "https://[::ffff:127.0.0.1]/a",
    "file:///tmp/a",
    "https://169.254.169.254/latest",
  ])('rejects "%s"', (url) => {
    expect(() =>
      assertSafePublicUrl(url, [
        "example.gov",
        "localhost",
        "127.0.0.1",
        "::1",
        "::ffff:127.0.0.1",
        "169.254.169.254",
      ]),
    ).toThrow();
  });
});

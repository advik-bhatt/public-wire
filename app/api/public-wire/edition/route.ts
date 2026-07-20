import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: {
        code: "ASYNC_CASE_REQUIRED",
        message:
          "Live checks now use durable case requests. POST to /api/public-wire/case-requests.",
      },
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

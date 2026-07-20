import type { NextRequest } from "next/server";
import { handleCaseRequest } from "@/lib/investigations/case-request";

export async function POST(request: NextRequest) {
  return handleCaseRequest(request);
}

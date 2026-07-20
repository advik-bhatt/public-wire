import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export function authenticateInternalCommand(request: NextRequest) {
  const configured = process.env.PUBLIC_WIRE_INTERNAL_COMMAND_TOKEN;
  const provided = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!configured || !provided) return undefined;
  const expectedHash = createHash("sha256").update(configured).digest();
  const providedHash = createHash("sha256").update(provided).digest();
  if (!timingSafeEqual(expectedHash, providedHash)) return undefined;
  const actor = process.env.PUBLIC_WIRE_INTERNAL_ACTOR;
  const role = process.env.PUBLIC_WIRE_INTERNAL_ACTOR_ROLE;
  if (
    !actor ||
    !/^[A-Za-z0-9._:@-]{3,160}$/.test(actor) ||
    !["editor", "administrator", "publisher"].includes(role || "")
  )
    return undefined;
  return { actor, role: role as "editor" | "administrator" | "publisher" };
}

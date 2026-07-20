import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "pw_requester_scope";

export const requesterScopeCookieName = COOKIE_NAME;

function secret() {
  const value = process.env.PUBLIC_WIRE_REQUEST_SCOPE_SECRET;
  return value && value.length >= 32 ? value : undefined;
}

function sign(id: string, key: string) {
  return createHmac("sha256", key).update(id).digest("base64url");
}

function scopeHash(id: string) {
  return createHash("sha256").update(id).digest("hex");
}

export function readRequesterScope(request: NextRequest) {
  return verifyRequesterScopeCookie(request.cookies.get(COOKIE_NAME)?.value);
}

export function verifyRequesterScopeCookie(raw: string | undefined) {
  const key = secret();
  if (!key || !raw) return undefined;
  const [id, signature] = raw.split(".");
  if (!id || !signature) return undefined;
  const expected = Buffer.from(sign(id, key));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return undefined;
  return {
    scopeHash: scopeHash(id),
    cookieValue: raw,
    created: false as const,
  };
}

export function createRequesterScope() {
  const key = secret();
  if (!key) return undefined;
  const id = randomBytes(32).toString("base64url");
  return {
    scopeHash: scopeHash(id),
    cookieValue: `${id}.${sign(id, key)}`,
    created: true as const,
  };
}

export function getOrCreateRequesterScope(request: NextRequest) {
  return readRequesterScope(request) ?? createRequesterScope();
}

export function attachRequesterScope(
  response: NextResponse,
  scope: { cookieValue: string; created: boolean },
) {
  if (!scope.created) return response;
  response.cookies.set(COOKIE_NAME, scope.cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

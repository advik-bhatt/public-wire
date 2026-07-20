import "server-only";

import type { ReadonlyContext } from "@google/adk";

export function instructionStateJson(context: ReadonlyContext, key: string) {
  const value = context.state.get(key);
  if (value === undefined)
    throw new Error(`PUBLIC_WIRE_INSTRUCTION_STATE_MISSING:${key}`);
  return JSON.stringify(value);
}

import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  var __publicWirePool: Pool | undefined;
}

export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("PUBLIC_WIRE_PERSISTENCE_UNAVAILABLE");
  if (!globalThis.__publicWirePool) {
    globalThis.__publicWirePool = new Pool({
      connectionString,
      max: Number(process.env.PUBLIC_WIRE_DB_POOL_MAX || 8),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      application_name: "public-wire",
      ssl:
        process.env.PUBLIC_WIRE_DB_SSL === "true"
          ? { rejectUnauthorized: true }
          : undefined,
    });
  }
  return globalThis.__publicWirePool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getPool().query<T>(text, values);
}

export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { getPool } from "../lib/db/postgres";

async function main() {
  const migrationDirectory = resolve(process.cwd(), "db/migrations");
  const migrations = (await readdir(migrationDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const client = await getPool().connect();
  try {
    await client.query(
      "SELECT pg_advisory_lock(hashtext('public-wire-schema-migrations'))",
    );
    await client.query(`CREATE TABLE IF NOT EXISTS public_wire_schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    for (const name of migrations) {
      const applied = await client.query(
        "SELECT 1 FROM public_wire_schema_migrations WHERE name=$1",
        [name],
      );
      if (applied.rowCount) continue;
      const sql = await readFile(resolve(migrationDirectory, name), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO public_wire_schema_migrations (name) VALUES ($1)",
          [name],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } catch (error) {
    throw error;
  } finally {
    await client
      .query(
        "SELECT pg_advisory_unlock(hashtext('public-wire-schema-migrations'))",
      )
      .catch(() => undefined);
    client.release();
    await getPool().end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration failed");
  process.exitCode = 1;
});

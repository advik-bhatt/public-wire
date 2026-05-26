import { createClient } from "@clickhouse/client";

type EventToLog = {
  step: number;
  title: string;
  detail: string;
  source: string;
  risk: string;
  status: string;
};

type MetricsToLog = Record<string, number>;

const hasClickHouseEnv =
  Boolean(process.env.CLICKHOUSE_URL) &&
  Boolean(process.env.CLICKHOUSE_USERNAME) &&
  Boolean(process.env.CLICKHOUSE_PASSWORD);

const client = hasClickHouseEnv
  ? createClient({
      url: process.env.CLICKHOUSE_URL,
      username: process.env.CLICKHOUSE_USERNAME,
      password: process.env.CLICKHOUSE_PASSWORD,
      database: process.env.CLICKHOUSE_DATABASE || "default",
    })
  : null;

let tablesEnsured = false;

export async function ensureClickHouseTables() {
  if (!client) return { enabled: false, reason: "ClickHouse env vars not configured" };
  if (tablesEnsured) return { enabled: true };

  await client.exec({
    query: `
      CREATE TABLE IF NOT EXISTS publicwire_events (
        session_id String,
        area String,
        step UInt32,
        title String,
        detail String,
        source String,
        risk String,
        status String,
        created_at DateTime64(3)
      )
      ENGINE = MergeTree
      ORDER BY (area, session_id, step)
    `,
  });

  await client.exec({
    query: `
      CREATE TABLE IF NOT EXISTS publicwire_metrics (
        session_id String,
        area String,
        metric String,
        value Float64,
        created_at DateTime64(3)
      )
      ENGINE = MergeTree
      ORDER BY (area, session_id, metric)
    `,
  });

  tablesEnsured = true;
  return { enabled: true };
}

export async function queryPriorEvents(area: string): Promise<{ count: number; lastSeen: string | null }> {
  if (!client) return { count: 0, lastSeen: null };

  try {
    await ensureClickHouseTables();

    // Count distinct sessions for this area (not raw event rows, which inflate the number).
    // Area is a first-class column so this uses the MergeTree index rather than a full string scan.
    const result = await client.query({
      query: `
        SELECT COUNT(DISTINCT session_id) as count, MAX(created_at) as last_seen
        FROM publicwire_events
        WHERE area = {area:String}
      `,
      query_params: { area },
      format: "JSONEachRow",
    });
    const rows = await result.json<{ count: string; last_seen: string }>();
    const row = rows[0];
    return {
      count: parseInt(row?.count || "0", 10),
      lastSeen: row?.last_seen || null,
    };
  } catch {
    return { count: 0, lastSeen: null };
  }
}

export async function logRecallFormRun(params: {
  sessionId: string;
  area: string;
  events: EventToLog[];
  metrics: MetricsToLog;
}) {
  if (!client) {
    return {
      enabled: false,
      message: "ClickHouse skipped. Add CLICKHOUSE_URL, CLICKHOUSE_USERNAME, CLICKHOUSE_PASSWORD to enable.",
    };
  }

  await ensureClickHouseTables();

  const now = new Date().toISOString();

  await client.insert({
    table: "publicwire_events",
    values: params.events.map((event) => ({
      session_id: params.sessionId,
      area: params.area,
      step: event.step,
      title: event.title,
      detail: event.detail,
      source: event.source,
      risk: event.risk,
      status: event.status,
      created_at: now,
    })),
    format: "JSONEachRow",
  });

  await client.insert({
    table: "publicwire_metrics",
    values: Object.entries(params.metrics).map(([metric, value]) => ({
      session_id: params.sessionId,
      area: params.area,
      metric,
      value,
      created_at: now,
    })),
    format: "JSONEachRow",
  });

  return {
    enabled: true,
    message: "ClickHouse audit ledger updated.",
  };
}

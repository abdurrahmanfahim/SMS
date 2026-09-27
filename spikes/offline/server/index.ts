import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import type { PGlite } from "@electric-sql/pglite";

import { callApplyOps, createSpikeDb, lockAttendanceDay, lockExamComponent } from "./db.js";

import type { OutboxOp } from "../src/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const harnessDir = join(here, "..", "harness");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

async function readJsonBody(req: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  return text === "" ? {} : JSON.parse(text);
}

/**
 * Starts the spike's HTTP server on an ephemeral port. Every request gets a fresh view of
 * the same `db` instance the caller passes in, so tests can seed/inspect it directly and
 * reset it between cases by creating a new PGlite and restarting the server.
 */
export function startServer(db: PGlite, port = 0) {
  const server = createServer((req, res) => {
    void handle(req, res).catch((error: unknown) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    });
  });

  async function handle(
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
  ): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "POST" && url.pathname === "/apply_ops") {
      const body = (await readJsonBody(req)) as { ops: OutboxOp[] };
      const result = await callApplyOps(db, body.ops);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (req.method === "POST" && url.pathname === "/admin/lock-attendance") {
      const body = (await readJsonBody(req)) as { institutionId: string; date: string };
      await lockAttendanceDay(db, body.institutionId, body.date);
      res.writeHead(204).end();
      return;
    }

    if (req.method === "POST" && url.pathname === "/admin/lock-exam") {
      const body = (await readJsonBody(req)) as { institutionId: string; componentId: string };
      await lockExamComponent(db, body.institutionId, body.componentId);
      res.writeHead(204).end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/admin/state") {
      const attendance = await db.query<{ n: number }>("select count(*)::int as n from attendance");
      const marks = await db.query<{ n: number }>("select count(*)::int as n from marks");
      const marksAudit = await db.query<{ n: number }>("select count(*)::int as n from marks_audit");
      const appliedOps = await db.query<{ n: number }>("select count(*)::int as n from applied_ops");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          attendance: attendance.rows[0]?.n ?? 0,
          marks: marks.rows[0]?.n ?? 0,
          marksAudit: marksAudit.rows[0]?.n ?? 0,
          appliedOps: appliedOps.rows[0]?.n ?? 0,
        }),
      );
      return;
    }

    // Static files for the Playwright harness page (index.html + the esbuild-bundled app.js).
    if (req.method === "GET") {
      const relativePath = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = normalize(join(harnessDir, relativePath));
      if (!filePath.startsWith(harnessDir)) {
        res.writeHead(403).end();
        return;
      }
      try {
        const content = await readFile(filePath);
        res.writeHead(200, { "content-type": MIME[extname(filePath)] ?? "application/octet-stream" });
        res.end(content);
      } catch {
        res.writeHead(404).end("not found");
      }
      return;
    }

    res.writeHead(404).end();
  }

  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address !== null ? address.port : port;
      resolve({
        url: `http://127.0.0.1:${actualPort}`,
        close: () =>
          new Promise((closeResolve) => {
            // Without this, server.close() waits for any lingering keep-alive sockets
            // (left open by fetch()'s default connection reuse) to end on their own,
            // which can hang teardown well past a test's timeout.
            server.closeAllConnections();
            server.close(() => closeResolve());
          }),
      });
    });
  });
}

/** Standalone entry point: `node server/index.js` -- boots a fresh db and listens on 4173. */
async function main(): Promise<void> {
  const db = await createSpikeDb();
  const { url } = await startServer(db, 4173);
  console.log(`offline-spike server listening on ${url}`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void main();
}

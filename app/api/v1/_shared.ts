import { env } from "cloudflare:workers";

export type Identity = { id: string; email: string; displayName: string; role: "analyst" | "operator" };

export function bindings() {
  const runtime = env as unknown as { DB?: D1Database; UPLOADS?: R2Bucket };
  if (!runtime.DB) throw new Error("D1 binding DB is unavailable");
  return { db: runtime.DB, uploads: runtime.UPLOADS };
}

export async function initialize(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'analyst', created_at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL, source_checksum TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects(owner_id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, owner_id TEXT NOT NULL, object_key TEXT NOT NULL, original_name TEXT NOT NULL, checksum TEXT NOT NULL, size_bytes INTEGER NOT NULL, row_count INTEGER NOT NULL, profile_json TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS uploads_project_idx ON uploads(project_id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, owner_id TEXT NOT NULL, algorithm TEXT NOT NULL, status TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, idempotency_key TEXT NOT NULL, config_json TEXT NOT NULL, result_json TEXT, created_at INTEGER NOT NULL, finished_at INTEGER)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS runs_idempotency_idx ON runs(owner_id, idempotency_key)"),
    db.prepare("CREATE INDEX IF NOT EXISTS runs_project_idx ON runs(project_id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS job_events (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, sequence INTEGER NOT NULL, event_type TEXT NOT NULL, detail TEXT NOT NULL, duration_ms REAL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS job_events_sequence_idx ON job_events(run_id, sequence)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT NOT NULL, metadata_json TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_resource_idx ON audit_events(resource_type, resource_id)"),
  ]);
}

export async function identity(request: Request): Promise<Identity> {
  const rawEmail = request.headers.get("oai-authenticated-user-email") || request.headers.get("x-graphshield-user") || "demo@graphshield.local";
  const email = rawEmail.trim().toLowerCase().slice(0, 254);
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  let displayName = email.split("@")[0];
  if (encodedName && request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
    try { displayName = decodeURIComponent(encodedName).slice(0, 100); } catch { /* use stable fallback */ }
  }
  const role: Identity["role"] = email === "demo@graphshield.local" || request.headers.get("x-graphshield-role") === "operator" ? "operator" : "analyst";
  const id = `usr_${await shortHash(email)}`;
  return { id, email, displayName, role };
}

export async function ensureUser(db: D1Database, user: Identity) {
  await db.prepare("INSERT INTO users (id,email,display_name,role,created_at) VALUES (?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name")
    .bind(user.id, user.email, user.displayName, user.role, Date.now()).run();
}

export function json(data: unknown, status = 200, headers: Record<string,string> = {}) {
  return Response.json(data, { status, headers: { "cache-control": "no-store", ...headers } });
}

export function problem(status: number, code: string, title: string, detail: string, action: string) {
  return json({ type: `https://graphshield.dev/problems/${code.toLowerCase().replaceAll("_","-")}`, title, status, detail, request_id: crypto.randomUUID(), errors: [{ code, action }] }, status);
}

export async function shortHash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 8), x => x.toString(16).padStart(2,"0")).join("");
}

export function safeName(value: string) { return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload.csv"; }

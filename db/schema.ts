import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["analyst", "operator"] }).notNull().default("analyst"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  status: text("status").notNull(),
  sourceChecksum: text("source_checksum"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("projects_owner_idx").on(table.ownerId)]);

export const uploads = sqliteTable("uploads", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  ownerId: text("owner_id").notNull().references(() => users.id),
  objectKey: text("object_key").notNull(),
  originalName: text("original_name").notNull(),
  checksum: text("checksum").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  rowCount: integer("row_count").notNull(),
  profileJson: text("profile_json").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("uploads_project_idx").on(table.projectId)]);

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  ownerId: text("owner_id").notNull().references(() => users.id),
  algorithm: text("algorithm").notNull(),
  status: text("status").notNull(),
  progress: integer("progress").notNull().default(0),
  idempotencyKey: text("idempotency_key").notNull(),
  configJson: text("config_json").notNull(),
  resultJson: text("result_json"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
}, (table) => [uniqueIndex("runs_idempotency_idx").on(table.ownerId, table.idempotencyKey), index("runs_project_idx").on(table.projectId)]);

export const jobEvents = sqliteTable("job_events", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => runs.id),
  sequence: integer("sequence").notNull(),
  eventType: text("event_type").notNull(),
  detail: text("detail").notNull(),
  durationMs: real("duration_ms"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("job_events_sequence_idx").on(table.runId, table.sequence)]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  metadataJson: text("metadata_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("audit_resource_idx").on(table.resourceType, table.resourceId)]);

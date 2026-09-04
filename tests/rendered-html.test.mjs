import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("production bundle contains the GraphShield experience", async () => {
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/client/og.png", import.meta.url));
  const files = await readdir(new URL("../dist/client/assets/", import.meta.url));
  assert.ok(files.some(name => name.startsWith("GraphShieldApp-") && name.endsWith(".js")));
  const source = await readFile(new URL("../app/GraphShieldApp.tsx", import.meta.url), "utf8");
  assert.match(source, /See the network behind suspicious activity/);
  assert.match(source, /Durable workspace/);
  assert.match(source, /profileUpload/);
  assert.doesNotMatch(source, /Your site is taking shape|react-loading-skeleton/i);
});

test("metadata and API routes are production-specific", async () => {
  const [layout, workspaceRoute, uploadRoute] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/workspace/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/upload/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /GraphShield \| Explainable graph investigations/);
  assert.match(workspaceRoute, /idempotencyKey/);
  assert.match(uploadRoute, /expiresAt/);
});

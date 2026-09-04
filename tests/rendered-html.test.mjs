import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL(`../dist/server/index.js?test=${process.pid}-${Date.now()}`, import.meta.url);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server renders GraphShield product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>GraphShield \| Explainable graph investigations<\/title>/i);
  assert.match(html, /Find the signal/);
  assert.match(html, /seeded case/i);
  assert.match(html, /GraphShield/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("landing page exposes a real button and descriptive content", async () => {
  const html = await (await render()).text();
  assert.match(html, /<button[^>]*>Explore the seeded case/);
  assert.match(html, /explainable network investigations/i);
  assert.match(html, /No sign-up/);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

// Point the store at a throwaway test DB file before requiring the app.
const TEST_DB = path.join(__dirname, "test-issues.json");
process.env.DB_PATH = TEST_DB;

const request = require("supertest");
const createApp = require("../src/app");
const store = require("../src/data/store");

const app = createApp();

test.beforeEach(() => {
  store._reset();
});

test.after(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

test("GET /health returns ok", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
});

test("POST /issues creates an issue with defaults", async () => {
  const res = await request(app)
    .post("/issues")
    .send({ title: "Card issuer timeout on auth callback" });

  assert.equal(res.status, 201);
  assert.equal(res.body.title, "Card issuer timeout on auth callback");
  assert.equal(res.body.status, "open");
  assert.equal(res.body.priority, "medium");
  assert.ok(res.body.id);
  assert.ok(res.body.createdAt);
});

test("POST /issues rejects a missing title", async () => {
  const res = await request(app).post("/issues").send({ priority: "high" });
  assert.equal(res.status, 400);
  assert.ok(res.body.errors.length > 0);
});

test("POST /issues rejects an invalid priority", async () => {
  const res = await request(app)
    .post("/issues")
    .send({ title: "Bad priority test", priority: "urgent-ish" });
  assert.equal(res.status, 400);
});

test("GET /issues lists created issues, newest first", async () => {
  await request(app).post("/issues").send({ title: "First issue" });
  await request(app).post("/issues").send({ title: "Second issue" });

  const res = await request(app).get("/issues");
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 2);
  assert.equal(res.body.issues[0].title, "Second issue");
});

test("GET /issues?status= filters correctly", async () => {
  await request(app).post("/issues").send({ title: "Open one", status: "open" });
  await request(app).post("/issues").send({ title: "Resolved one", status: "resolved" });

  const res = await request(app).get("/issues?status=resolved");
  assert.equal(res.body.count, 1);
  assert.equal(res.body.issues[0].title, "Resolved one");
});

test("GET /issues/:id returns 404 for unknown id", async () => {
  const res = await request(app).get("/issues/does-not-exist");
  assert.equal(res.status, 404);
});

test("PATCH /issues/:id updates fields and bumps updatedAt", async () => {
  const created = await request(app).post("/issues").send({ title: "To be updated" });
  const originalUpdatedAt = created.body.updatedAt;

  await new Promise((r) => setTimeout(r, 5));

  const res = await request(app)
    .patch(`/issues/${created.body.id}`)
    .send({ status: "resolved" });

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "resolved");
  assert.equal(res.body.id, created.body.id);
  assert.notEqual(res.body.updatedAt, originalUpdatedAt);
});

test("PATCH /issues/:id on unknown id returns 404", async () => {
  const res = await request(app).patch("/issues/does-not-exist").send({ status: "closed" });
  assert.equal(res.status, 404);
});

test("DELETE /issues/:id removes the issue", async () => {
  const created = await request(app).post("/issues").send({ title: "To be deleted" });

  const del = await request(app).delete(`/issues/${created.body.id}`);
  assert.equal(del.status, 204);

  const getAfter = await request(app).get(`/issues/${created.body.id}`);
  assert.equal(getAfter.status, 404);
});

test("unknown route returns a structured 404", async () => {
  const res = await request(app).get("/nope");
  assert.equal(res.status, 404);
  assert.ok(res.body.error);
});

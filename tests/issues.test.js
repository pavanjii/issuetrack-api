const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { errorHandler } = require("../src/middleware/errorHandler");

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


test("GET / returns API information", async () => {
  const res = await request(app).get("/");

  assert.equal(res.status, 200);
  assert.equal(res.body.name, "IssueTrack API");
  assert.equal(res.body.status, "ok");
  assert.deepEqual(res.body.endpoints, {
    health: "/health",
    issues: "/issues",
  });
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


test("GET / returns API information", async () => {
  const response = await request(app).get("/");

  assert.equal(response.status, 200);
  assert.equal(response.body.name, "IssueTrack API");
  assert.equal(response.body.status, "ok");
  assert.deepEqual(response.body.endpoints, {
    health: "/health",
    issues: "/issues",
  });
});



test("unknown route returns a structured 404", async () => {
  const res = await request(app).get("/nope");
  assert.equal(res.status, 404);
  assert.ok(res.body.error);
});


test("POST /issues rejects a whitespace-only title", async () => {
  const res = await request(app)
    .post("/issues")
    .send({ title: "   " });

  assert.equal(res.status, 400);
  assert.ok(res.body.errors.length > 0);
});

test("POST /issues rejects a non-string title", async () => {
  const res = await request(app)
    .post("/issues")
    .send({ title: 123 });

  assert.equal(res.status, 400);
});

test("POST /issues rejects an invalid status", async () => {
  const res = await request(app)
    .post("/issues")
    .send({ title: "Invalid status", status: "pending" });

  assert.equal(res.status, 400);
});

test("POST /issues accepts valid status and priority", async () => {
  const res = await request(app)
    .post("/issues")
    .send({
      title: "Valid enum values",
      status: "in_progress",
      priority: "critical"
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.status, "in_progress");
  assert.equal(res.body.priority, "critical");
});

test("PATCH /issues/:id rejects an empty title", async () => {
  const created = await request(app)
    .post("/issues")
    .send({ title: "Original title" });

  const res = await request(app)
    .patch(`/issues/${created.body.id}`)
    .send({ title: " " });

  assert.equal(res.status, 400);
});

test("PATCH /issues/:id rejects a non-string title", async () => {
  const created = await request(app)
    .post("/issues")
    .send({ title: "Original title" });

  const res = await request(app)
    .patch(`/issues/${created.body.id}`)
    .send({ title: 123 });

  assert.equal(res.status, 400);
});

test("PATCH /issues/:id rejects an invalid status", async () => {
  const created = await request(app)
    .post("/issues")
    .send({ title: "Status validation" });

  const res = await request(app)
    .patch(`/issues/${created.body.id}`)
    .send({ status: "pending" });

  assert.equal(res.status, 400);
});

test("PATCH /issues/:id rejects an invalid priority", async () => {
  const created = await request(app)
    .post("/issues")
    .send({ title: "Priority validation" });

  const res = await request(app)
    .patch(`/issues/${created.body.id}`)
    .send({ priority: "urgent" });

  assert.equal(res.status, 400);
});


test("errorHandler returns the supplied status and message", () => {
  let statusCode;
  let responseBody;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  };

  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    errorHandler(
      { status: 503, message: "Service unavailable" },
      {},
      res,
      () => {}
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(statusCode, 503);
  assert.deepEqual(responseBody, {
    error: "Service unavailable"
  });
});

test("errorHandler defaults to status 500 and a generic message", () => {
  let statusCode;
  let responseBody;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  };

  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    errorHandler({}, {}, res, () => {});
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(statusCode, 500);
  assert.deepEqual(responseBody, {
    error: "internal server error"
  });
});


test("GET /issues/:id returns 404 for an issue that does not exist", async () => {
  const res = await request(app).get("/issues/nonexistent-id");

  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: "issue not found" });
});

test("DELETE /issues/:id returns 404 for an issue that does not exist", async () => {
  const res = await request(app).delete("/issues/nonexistent-id");

  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: "issue not found" });
});

test("store.update returns null for an unknown issue ID", () => {
  const updated = store.update("nonexistent-id", { status: "closed" });

  assert.equal(updated, null);
});

test("store.remove returns false for an unknown issue ID", () => {
  const removed = store.remove("nonexistent-id");

  assert.equal(removed, false);
});

test("store handles invalid JSON by returning an empty list", () => {
  fs.writeFileSync(TEST_DB, "{invalid json", "utf-8");

  assert.deepEqual(store.list(), []);
});

test("store creates the database file if it does not exist", () => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

  assert.deepEqual(store.list(), []);
  assert.equal(fs.existsSync(TEST_DB), true);
});


test("GET /issues/:id returns an existing issue", async () => {
  const created = await request(app)
    .post("/issues")
    .send({ title: "Retrieve this issue" });

  const res = await request(app)
    .get(`/issues/${created.body.id}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.id, created.body.id);
  assert.equal(res.body.title, "Retrieve this issue");
});


test("GET /issues?priority= filters correctly", async () => {
  await request(app)
    .post("/issues")
    .send({ title: "Low priority", priority: "low" });

  await request(app)
    .post("/issues")
    .send({ title: "High priority", priority: "high" });

  const res = await request(app).get("/issues?priority=high");

  assert.equal(res.status, 200);
  assert.equal(res.body.count, 1);
  assert.equal(res.body.issues[0].title, "High priority");
});

test("GET /issues?service= filters correctly", async () => {
  await request(app)
    .post("/issues")
    .send({ title: "Card issue", service: "card-gateway" });

  await request(app)
    .post("/issues")
    .send({ title: "Payment issue", service: "payment-service" });

  const res = await request(app).get("/issues?service=card-gateway");

  assert.equal(res.status, 200);
  assert.equal(res.body.count, 1);
  assert.equal(res.body.issues[0].title, "Card issue");
});



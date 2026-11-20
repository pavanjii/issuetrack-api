const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const bcrypt = require("bcryptjs");
const { errorHandler } = require("../src/middleware/errorHandler");

// Use an isolated database and test-only credentials.
const TEST_DB = path.join(__dirname, "test-issues.json");
process.env.DB_PATH = TEST_DB;

process.env.AUTH_USERNAME = "test-admin";
process.env.AUTH_PASSWORD_HASH = bcrypt.hashSync("TestPassword123!", 4);
process.env.JWT_SECRET = "test-only-secret-for-issuetrack-api";
process.env.JWT_EXPIRES_IN = "1h";

const supertest = require("supertest");
const createApp = require("../src/app");
const store = require("../src/data/store");

const app = createApp({ rateLimit: { generalMax: 100000, authMax: 100000 } });

let authToken;

function request(app) {
  const agent = supertest(app);

  return {
    get(url) {
      const req = agent.get(url);
      return url.startsWith("/issues") && authToken
        ? req.set("Authorization", `Bearer ${authToken}`)
        : req;
    },

    post(url) {
      const req = agent.post(url);
      return url.startsWith("/issues") && authToken
        ? req.set("Authorization", `Bearer ${authToken}`)
        : req;
    },

    patch(url) {
      const req = agent.patch(url);
      return url.startsWith("/issues") && authToken
        ? req.set("Authorization", `Bearer ${authToken}`)
        : req;
    },

    delete(url) {
      const req = agent.delete(url);
      return url.startsWith("/issues") && authToken
        ? req.set("Authorization", `Bearer ${authToken}`)
        : req;
    },
  };
}

test.before(async () => {
  const response = await supertest(app)
    .post("/auth/token")
    .send({
      username: "test-admin",
      password: "TestPassword123!",
    });

  assert.equal(response.status, 200);
  assert.ok(response.body.token);

  authToken = response.body.token;
});

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


test("GET / returns API information", async () => {
  const res = await request(app).get("/");

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.endpoints, {
    health: "/health",
    auth: "/auth/token",
    issues: "/issues",
  });
});


test("POST /auth/token returns a JWT for valid credentials", async () => {
  const res = await supertest(app)
    .post("/auth/token")
    .send({
      username: "test-admin",
      password: "TestPassword123!",
    });

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.tokenType, "Bearer");
  assert.equal(res.body.expiresIn, "1h");
});

test("POST /auth/token rejects incorrect credentials", async () => {
  const res = await supertest(app)
    .post("/auth/token")
    .send({
      username: "test-admin",
      password: "WrongPassword123!",
    });

  assert.equal(res.status, 401);
});

test("GET /issues rejects requests without a token", async () => {
  const res = await supertest(app).get("/issues");
  assert.equal(res.status, 401);
});

test("GET /issues rejects an invalid token", async () => {
  const res = await supertest(app)
    .get("/issues")
    .set("Authorization", "Bearer invalid-token");

  assert.equal(res.status, 401);
});

test("GET /issues rejects a malformed authorization header", async () => {
  const res = await supertest(app)
    .get("/issues")
    .set("Authorization", "Basic invalid-token");

  assert.equal(res.status, 401);
});

const jwt = require("jsonwebtoken");

const LOGIN_BODY = { username: "test-admin", password: "TestPassword123!" };

// Temporarily override env vars (undefined = delete), always restoring them.
async function withEnv(overrides, fn) {
  const saved = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    if (overrides[key] === undefined) delete process.env[key];
    else process.env[key] = overrides[key];
  }
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test("POST /auth/token returns 500 when authentication is not configured", async () => {
  for (const key of ["AUTH_USERNAME", "AUTH_PASSWORD_HASH", "JWT_SECRET"]) {
    await withEnv({ [key]: undefined }, async () => {
      const res = await supertest(app).post("/auth/token").send(LOGIN_BODY);
      assert.equal(res.status, 500, `expected 500 when ${key} is missing`);
      assert.equal(res.body.error, "Authentication is not configured");
    });
  }
});

test("POST /auth/token rejects non-string or missing credentials", async () => {
  for (const body of [
    { username: 123, password: LOGIN_BODY.password },
    { username: LOGIN_BODY.username, password: 123 },
    {},
  ]) {
    const res = await supertest(app).post("/auth/token").send(body);
    assert.equal(res.status, 401);
  }
});

test("POST /auth/token gives the same error for unknown user and wrong password", async () => {
  const unknownUser = await supertest(app)
    .post("/auth/token")
    .send({ username: "nobody", password: LOGIN_BODY.password });
  const wrongPassword = await supertest(app)
    .post("/auth/token")
    .send({ username: LOGIN_BODY.username, password: "WrongPassword123!" });

  assert.equal(unknownUser.status, 401);
  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(unknownUser.body, wrongPassword.body);
});

test("POST /auth/token defaults to a 1h expiry when JWT_EXPIRES_IN is unset", async () => {
  await withEnv({ JWT_EXPIRES_IN: undefined }, async () => {
    const res = await supertest(app).post("/auth/token").send(LOGIN_BODY);
    assert.equal(res.status, 200);
    assert.equal(res.body.expiresIn, "1h");
  });
});

test("GET /issues returns 500 when JWT_SECRET is missing on the server", async () => {
  await withEnv({ JWT_SECRET: undefined }, async () => {
    const res = await supertest(app)
      .get("/issues")
      .set("Authorization", `Bearer ${authToken}`);
    assert.equal(res.status, 500);
  });
});

test("GET /issues rejects a token signed with the wrong secret", async () => {
  const forged = jwt.sign({ sub: "test-admin" }, "some-other-secret");
  const res = await supertest(app)
    .get("/issues")
    .set("Authorization", `Bearer ${forged}`);
  assert.equal(res.status, 401);
});

test("GET /issues rejects an expired token", async () => {
  const expired = jwt.sign({ sub: "test-admin" }, process.env.JWT_SECRET, {
    expiresIn: -10,
  });
  const res = await supertest(app)
    .get("/issues")
    .set("Authorization", `Bearer ${expired}`);
  assert.equal(res.status, 401);
});

test("GET /issues rejects an unsigned (alg: none) token", async () => {
  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${enc({ alg: "none", typ: "JWT" })}.${enc({ sub: "test-admin" })}.`;
  const res = await supertest(app)
    .get("/issues")
    .set("Authorization", `Bearer ${unsigned}`);
  assert.equal(res.status, 401);
});
test("responses include Helmet security headers and hide X-Powered-By", async () => {
  const res = await supertest(app).get("/health");

  assert.equal(res.status, 200);
  assert.equal(res.headers["x-powered-by"], undefined);
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.equal(res.headers["x-frame-options"], "SAMEORIGIN");
  assert.match(res.headers["strict-transport-security"], /max-age=/);
  assert.ok(res.headers["content-security-policy"]);
});

test("security headers are also set on 401 responses from protected routes", async () => {
  const res = await supertest(app).get("/issues");

  assert.equal(res.status, 401);
  assert.equal(res.headers["x-powered-by"], undefined);
  assert.equal(res.headers["x-content-type-options"], "nosniff");
});

test("security headers are also set on 404 responses", async () => {
  const res = await supertest(app).get("/nope");

  assert.equal(res.status, 404);
  assert.equal(res.headers["x-powered-by"], undefined);
  assert.equal(res.headers["x-content-type-options"], "nosniff");
});
test("auth limiter returns 429 after too many failed logins", async () => {
  const limited = createApp({ rateLimit: { authMax: 3 } });
  const bad = { username: "test-admin", password: "WrongPassword123!" };

  for (let i = 0; i < 3; i++) {
    const res = await supertest(limited).post("/auth/token").send(bad);
    assert.equal(res.status, 401);
  }

  const blocked = await supertest(limited).post("/auth/token").send(bad);
  assert.equal(blocked.status, 429);
  assert.ok(blocked.body.error);
});

test("auth limiter does not count successful logins", async () => {
  const limited = createApp({ rateLimit: { authMax: 2 } });
  const good = { username: "test-admin", password: "TestPassword123!" };

  for (let i = 0; i < 5; i++) {
    const res = await supertest(limited).post("/auth/token").send(good);
    assert.equal(res.status, 200);
  }
});

test("general limiter returns 429 but never blocks /health", async () => {
  const limited = createApp({ rateLimit: { generalMax: 3 } });

  for (let i = 0; i < 3; i++) {
    const res = await supertest(limited).get("/issues");
    assert.equal(res.status, 401);
  }

  const blocked = await supertest(limited).get("/issues");
  assert.equal(blocked.status, 429);

  const health = await supertest(limited).get("/health");
  assert.equal(health.status, 200);
});
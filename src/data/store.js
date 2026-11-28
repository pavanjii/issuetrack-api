// Minimal file-backed persistence layer.
//
// This is intentionally simple: a JSON file on disk instead of a full
// database server, so the API has zero external dependencies and can be
// deployed anywhere Node runs without provisioning anything else. Swapping
// this module for a real database (Postgres/MySQL/Mongo) later would not
// require touching the routes or controllers - they only talk to the
// functions exported here.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "issues.json");

// In-memory copy of the file. It is reused until the file changes on disk,
// so reads no longer re-read and re-parse the whole file on every request.
let cache = null; // { issues, mtimeMs, size }

function fileSignature() {
  try {
    const { mtimeMs, size } = fs.statSync(DB_PATH);
    return { mtimeMs, size };
  } catch {
    return null; // file does not exist
  }
}

function readAll() {
  const sig = fileSignature();
  if (sig && cache && cache.mtimeMs === sig.mtimeMs && cache.size === sig.size) {
    return cache.issues.slice(); // copy, so callers can't mutate the cache
  }
  if (!sig) {
    fs.writeFileSync(DB_PATH, "[]", "utf-8");
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  let issues;
  try {
    issues = JSON.parse(raw);
  } catch {
    issues = [];
  }
  cache = { issues, ...fileSignature() };
  return issues.slice();
}

function writeAll(issues) {
  fs.writeFileSync(DB_PATH, JSON.stringify(issues, null, 2), "utf-8");
  cache = { issues, ...fileSignature() };
}

function list(filters = {}) {
  let issues = readAll();
  if (filters.status) issues = issues.filter((i) => i.status === filters.status);
  if (filters.priority) issues = issues.filter((i) => i.priority === filters.priority);
  if (filters.service) issues = issues.filter((i) => i.service === filters.service);
  return issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function findById(id) {
  return readAll().find((i) => i.id === id) || null;
}

function create(data) {
  const issues = readAll();
  const now = new Date().toISOString();
  const issue = {
    id: crypto.randomUUID(),
    title: data.title,
    description: data.description || "",
    status: data.status || "open",
    priority: data.priority || "medium",
    service: data.service || "unspecified",
    createdAt: now,
    updatedAt: now,
  };
  issues.push(issue);
  writeAll(issues);
  return issue;
}

function update(id, patch) {
  const issues = readAll();
  const idx = issues.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  issues[idx] = {
    ...issues[idx],
    ...patch,
    id: issues[idx].id, // id and createdAt are immutable
    createdAt: issues[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  writeAll(issues);
  return issues[idx];
}

function remove(id) {
  const issues = readAll();
  const next = issues.filter((i) => i.id !== id);
  const removed = next.length !== issues.length;
  if (removed) writeAll(next);
  return removed;
}

// Test/dev helper - not used by the running app.
function _reset() {
  writeAll([]);
}

module.exports = { list, findById, create, update, remove, _reset, DB_PATH };

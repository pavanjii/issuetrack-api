const store = require("../data/store");
const { validateCreate, validateUpdate } = require("../validation");

function listIssues(req, res) {
  const { status, priority, service } = req.query;
  const issues = store.list({ status, priority, service });
  res.json({ count: issues.length, issues });
}

function getIssue(req, res) {
  const issue = store.findById(req.params.id);
  if (!issue) return res.status(404).json({ error: "issue not found" });
  res.json(issue);
}

function createIssue(req, res) {
  const errors = validateCreate(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const issue = store.create(req.body);
  res.status(201).json(issue);
}

function updateIssue(req, res) {
  const existing = store.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: "issue not found" });
  const errors = validateUpdate(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const updated = store.update(req.params.id, req.body);
  res.json(updated);
}

function deleteIssue(req, res) {
  const removed = store.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: "issue not found" });
  res.status(204).send();
}

module.exports = { listIssues, getIssue, createIssue, updateIssue, deleteIssue };

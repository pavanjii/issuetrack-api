const STATUSES = ["open", "in_progress", "resolved", "closed"];
const PRIORITIES = ["low", "medium", "high", "critical"];

function validateCreate(body) {
  const errors = [];
  if (!body || typeof body.title !== "string" || body.title.trim() === "") {
    errors.push("title is required and must be a non-empty string");
  }
  if (body.status && !STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${STATUSES.join(", ")}`);
  }
  if (body.priority && !PRIORITIES.includes(body.priority)) {
    errors.push(`priority must be one of: ${PRIORITIES.join(", ")}`);
  }
  return errors;
}

function validateUpdate(body) {
  const errors = [];
  if (body.title !== undefined && (typeof body.title !== "string" || body.title.trim() === "")) {
    errors.push("title must be a non-empty string");
  }
  if (body.status && !STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${STATUSES.join(", ")}`);
  }
  if (body.priority && !PRIORITIES.includes(body.priority)) {
    errors.push(`priority must be one of: ${PRIORITIES.join(", ")}`);
  }
  return errors;
}

module.exports = { STATUSES, PRIORITIES, validateCreate, validateUpdate };

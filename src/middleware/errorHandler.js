// Catches anything thrown/passed to next() in route handlers so the API
// always returns structured JSON instead of leaking a stack trace or
// hanging the request.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || "internal server error",
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `no route for ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };

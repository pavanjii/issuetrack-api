
const express = require("express");
const issuesRouter = require("./routes/issues");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/", (req, res) => {
    res.status(200).json({
      name: "IssueTrack API",
      status: "ok",
      endpoints: {
        health: "/health",
        issues: "/issues",
      },
    });
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.use("/issues", issuesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;

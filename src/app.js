require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const issuesRouter = require("./routes/issues");
const authRouter = require("./routes/auth");
const authenticateToken = require("./middleware/authMiddleware");
const {
  errorHandler,
  notFoundHandler,
} = require("./middleware/errorHandler");

function createApp() {
  const app = express();
  app.use(helmet());
  app.use(express.json());

  app.get("/", (req, res) => {
    res.status(200).json({
      name: "IssueTrack API",
      status: "ok",
      endpoints: {
        health: "/health",
        auth: "/auth/token",
        issues: "/issues",
      },
    });
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.use("/auth", authRouter);

  app.use("/issues", authenticateToken, issuesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
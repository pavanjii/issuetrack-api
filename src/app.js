require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const issuesRouter = require("./routes/issues");
const authRouter = require("./routes/auth");
const authenticateToken = require("./middleware/authMiddleware");
const {
  errorHandler,
  notFoundHandler,
} = require("./middleware/errorHandler");

function createApp(options = {}) {
  const limits = {
    windowMs: 15 * 60 * 1000,
    generalMax: Number(process.env.RATE_LIMIT_GENERAL_MAX) || 100,
    authMax: Number(process.env.RATE_LIMIT_AUTH_MAX) || 10,
    ...options.rateLimit,
  };

  const app = express();

  // Number of reverse proxies in front of the app (0 locally).
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS) || 0);

  app.use(helmet());

  app.use(
    rateLimit({
      windowMs: limits.windowMs,
      limit: limits.generalMax,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === "/health",
      message: { error: "Too many requests, please try again later" },
    })
  );

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

  // Only failed logins count toward this limit.
  const authLimiter = rateLimit({
    windowMs: limits.windowMs,
    limit: limits.authMax,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many failed login attempts, please try again later" },
  });

  app.use("/auth", authLimiter, authRouter);

  app.use("/issues", authenticateToken, issuesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
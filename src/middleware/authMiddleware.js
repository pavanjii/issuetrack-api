const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication token required",
    });
  }

  const token = authHeader.slice(7);

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        error: "Authentication is not configured",
      });
    }

    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });

    req.user = {
      username: decoded.sub,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired authentication token",
    });
  }
}

module.exports = authenticateToken;
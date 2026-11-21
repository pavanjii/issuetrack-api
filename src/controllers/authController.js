const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function login(req, res) {
  const { username, password } = req.body || {};

  const configuredUsername = process.env.AUTH_USERNAME;
  const passwordHash = process.env.AUTH_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;

  // TEMPORARY DIAGNOSTIC - remove after debugging. Logs lengths and booleans only.
  console.log("AUTH-DIAG", JSON.stringify({
    usernameMatches: typeof username === "string" && username === configuredUsername,
    configuredUsernameLength: configuredUsername ? configuredUsername.length : null,
    receivedUsernameLength: typeof username === "string" ? username.length : null,
    hashLength: passwordHash ? passwordHash.length : null,
    hashPrefix: passwordHash ? passwordHash.slice(0, 4) : null,
    hashHasWhitespaceOrQuote: passwordHash ? /["'\s]/.test(passwordHash) : null,
    passwordIsString: typeof password === "string",
    compareResult: typeof password === "string" && passwordHash ? await bcrypt.compare(password, passwordHash) : null,
  }));

  if (!configuredUsername || !passwordHash || !jwtSecret) {
    return res.status(500).json({
      error: "Authentication is not configured",
    });
  }

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username !== configuredUsername
  ) {
    return res.status(401).json({
      error: "Invalid username or password",
    });
  }

  const passwordMatches = await bcrypt.compare(password, passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({
      error: "Invalid username or password",
    });
  }

  const token = jwt.sign(
    { sub: configuredUsername },
    jwtSecret,
    { algorithm: "HS256", expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );

  return res.status(200).json({
    token,
    tokenType: "Bearer",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });
}

module.exports = { login };
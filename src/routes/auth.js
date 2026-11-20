const express = require("express");
const { login } = require("../controllers/authController");

const router = express.Router();

router.post("/token", login);

module.exports = router;
const express = require("express");
const controller = require("../controllers/issuesController");

const router = express.Router();

router.get("/", controller.listIssues);
router.get("/:id", controller.getIssue);
router.post("/", controller.createIssue);
router.patch("/:id", controller.updateIssue);
router.delete("/:id", controller.deleteIssue);

module.exports = router;

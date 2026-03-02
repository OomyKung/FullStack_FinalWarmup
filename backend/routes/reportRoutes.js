const express = require("express");
const controller = require("../controllers/reportController");

const router = express.Router();

router.get("/enrollment-summary", controller.getEnrollmentSummary);

module.exports = router;

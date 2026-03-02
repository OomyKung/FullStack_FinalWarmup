const express = require("express");
const controller = require("../controllers/enrollmentController");

const router = express.Router();

router.get("/", controller.getAllEnrollments);
router.get("/:id", controller.getEnrollmentById);
router.post("/", controller.createEnrollment);
router.put("/:id", controller.updateEnrollment);
router.delete("/:id", controller.deleteEnrollment);

module.exports = router;

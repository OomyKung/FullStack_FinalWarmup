const express = require("express");
const controller = require("../controllers/subjectController");

const router = express.Router();

router.get("/", controller.getAllSubjects);
router.get("/:id", controller.getSubjectById);
router.post("/", controller.createSubject);
router.put("/:id", controller.updateSubject);
router.delete("/:id", controller.deleteSubject);

module.exports = router;

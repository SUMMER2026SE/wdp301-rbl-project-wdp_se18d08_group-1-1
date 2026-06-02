const express = require("express");
const { protect, authorize } = require("../middlewares/authMiddleware");
const {
  getAllFloors,
  createFloor,
  updateFloorLayout,
  deleteFloor
} = require("../controllers/parkingFloorController");

const router = express.Router();

router.use(protect);
router.get("/", getAllFloors);

// Restrict modifications to admin and staff using the correct authorize middleware
router.use(authorize("admin", "staff"));

router.post("/", createFloor);
router.put("/:id/layout", updateFloorLayout);
router.delete("/:id", deleteFloor);

module.exports = router;

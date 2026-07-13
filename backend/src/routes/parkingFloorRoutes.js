const express = require("express");
const { protect, authorize } = require("../middlewares/authMiddleware");
const {
  getAllFloors,
  createFloor,
  updateFloorLayout,
  deleteFloor,
  getFloorSlots,
  getLiveMapData
} = require("../controllers/parkingFloorController");

const router = express.Router();

// Public route: get all floors (for Kiosk and users)
router.get("/", getAllFloors);
router.get("/live-map", getLiveMapData);
router.get("/:id/slots", getFloorSlots);

// Middleware bảo vệ các route dưới đây (yêu cầu đăng nhập)
router.use(protect);

// Restrict modifications to admin and staff using the correct authorize middleware
router.use(authorize("admin", "staff"));

router.post("/", createFloor);
router.put("/:id/layout", updateFloorLayout);
router.delete("/:id", deleteFloor);

module.exports = router;

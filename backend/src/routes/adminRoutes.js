const express = require("express");
const multer = require("multer");
const { protect, authorize } = require("../middlewares/authMiddleware");
const {
  uploadVehicleModel,
  deleteVehicleModel,
  listVehicleModels,
  syncAllVehicleModels,
  getPendingVehicles,
  approveVehicle,
  rejectVehicle,
  searchUsers,
} = require("../controllers/adminController");
const {
  getPackageTypes,
  createPackageType,
  updatePackageType,
  deletePackageType,
  getTicketPackages,
  getTicketPackageById,
  createTicketPackage,
  updateTicketPackage,
  deleteTicketPackage,
  getTicketPackageStats,
} = require("../controllers/ticketPackageController");

const router = express.Router();

// Multer – memory storage (no disk writes), max 50 MB per model file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith(".glb")) {
      cb(null, true);
    } else {
      cb(new Error("Only .glb files are allowed"));
    }
  },
});

// All admin routes require a valid JWT
router.use(protect);

// Users (allow both admin and staff)
router.get("/users/search", authorize("admin", "staff"), searchUsers);

// The rest require admin role
router.use(authorize("admin"));

// Vehicle 3D models
router.get("/vehicles/models", listVehicleModels);
router.post(
  "/vehicles/upload-model",
  upload.single("file"),
  uploadVehicleModel,
);
router.delete("/vehicles/upload-model", deleteVehicleModel);
router.post("/vehicles/sync-models", syncAllVehicleModels);

// Users
router.get("/users", require("../controllers/adminController").listUsers);
router.put(
  "/users/:id/status",
  require("../controllers/adminController").updateUserStatus,
);
router.put("/users/:id", require("../controllers/adminController").updateUser);

// Vehicle approval
router.get("/vehicles/pending", getPendingVehicles);
router.patch("/vehicles/:id/approve", approveVehicle);
router.delete("/vehicles/:id/reject", rejectVehicle);

// Ticket Packages
router.get("/package-types", getPackageTypes);
router.post("/package-types", createPackageType);
router.put("/package-types/:id", updatePackageType);
router.delete("/package-types/:id", deletePackageType);

router.get("/ticket-packages/stats", getTicketPackageStats);
router.get("/ticket-packages", getTicketPackages);
router.post("/ticket-packages", createTicketPackage);
router.get("/ticket-packages/:id", getTicketPackageById);
router.put("/ticket-packages/:id", updateTicketPackage);
router.delete("/ticket-packages/:id", deleteTicketPackage);

module.exports = router;

const ParkingFloor = require("../models/ParkingFloor");

// Get all parking floors
exports.getAllFloors = async (req, res) => {
  try {
    const floors = await ParkingFloor.find().sort({ floorNumber: 1 });
    res.status(200).json({ success: true, data: floors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new floor
exports.createFloor = async (req, res) => {
  try {
    const { floorNumber, name, layoutData } = req.body;
    
    // Default layout structure if not provided
    const initialLayout = layoutData || {
      width: 1000,
      height: 600,
      elements: []
    };

    const newFloor = await ParkingFloor.create({
      floorNumber,
      name,
      layoutData: initialLayout
    });

    res.status(201).json({ success: true, data: newFloor });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Floor number already exists" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update layout of a specific floor
exports.updateFloorLayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { layoutData } = req.body;

    const floor = await ParkingFloor.findByIdAndUpdate(
      id,
      { layoutData },
      { new: true, runValidators: true }
    );

    if (!floor) {
      return res.status(404).json({ success: false, message: "Floor not found" });
    }

    res.status(200).json({ success: true, data: floor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a floor
exports.deleteFloor = async (req, res) => {
  try {
    const { id } = req.params;
    const floor = await ParkingFloor.findByIdAndDelete(id);

    if (!floor) {
      return res.status(404).json({ success: false, message: "Floor not found" });
    }

    res.status(200).json({ success: true, message: "Floor deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

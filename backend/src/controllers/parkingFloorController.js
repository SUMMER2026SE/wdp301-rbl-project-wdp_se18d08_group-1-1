const ParkingFloor = require("../models/ParkingFloor");
const Zone = require("../models/Zone");
const Slot = require("../models/Slot");

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

    // Validate layoutData
    if (layoutData && Array.isArray(layoutData.elements)) {
      const elements = layoutData.elements;

      // 1. Process Zones
      const zoneElements = elements.filter(el => el.type === 'zone');
      const zoneDocsMap = {}; // Maps frontend zone.id to MongoDB Zone._id

      for (const zEl of zoneElements) {
        // Upsert Zone
        const zone = await Zone.findOneAndUpdate(
          { floorID: id, zoneName: zEl.name },
          { 
            zoneType: zEl.zoneType || 'standard',
          },
          { new: true, upsert: true }
        );
        // Keep spatial bounds to map slots
        zoneDocsMap[zEl.id] = {
          _id: zone._id,
          x: zEl.x,
          y: zEl.y,
          w: zEl.w,
          h: zEl.h
        };
      }

      // 2. Process Slots & Spatial Mapping
      const slotElements = elements.filter(el => el.type.startsWith('slot'));
      const bulkSlotOps = [];
      const validSlotNames = [];

      for (const sEl of slotElements) {
        // -------------------------------------------------------------
        // OPTIMIZATION: If a parking slot has not been named,
        // do not save it to the database to avoid overload and stale data.
        // The slot remains in layoutData for builder display but cannot be booked.
        // -------------------------------------------------------------
        if (!sEl.name || sEl.name.trim() === '') {
          continue;
        }

        // Find which zone this slot falls into
        let matchedZoneId = null;
        for (const zId in zoneDocsMap) {
          const zBounds = zoneDocsMap[zId];
          // Check if point (sEl.x, sEl.y) is inside rectangle (zBounds)
          if (
            sEl.x >= zBounds.x &&
            sEl.x <= zBounds.x + zBounds.w &&
            sEl.y >= zBounds.y &&
            sEl.y <= zBounds.y + zBounds.h
          ) {
            matchedZoneId = zBounds._id;
            break;
          }
        }

        const slotIdentifier = sEl.name.trim();
        validSlotNames.push(slotIdentifier);

        // 3. Validation: Every slot MUST belong to a zone
        if (!matchedZoneId) {
          return res.status(400).json({ 
            success: false, 
            message: `Error: Parking slot ${slotIdentifier} is outside every Zone. Please drag this slot into a valid Zone.`
          });
        }

        // Prepare bulk operation for Slot
        bulkSlotOps.push({
          updateOne: {
            filter: { floorID: id, slotNumber: slotIdentifier },
            update: {
              $set: {
                zoneID: matchedZoneId,
                slotType: sEl.type.replace('slot-', '') || 'hourly',
                gridX: sEl.x,
                gridY: sEl.y,
              }
            },
            upsert: true
          }
        });
      }

      // Execute bulk write for slots
      if (bulkSlotOps.length > 0) {
        await Slot.bulkWrite(bulkSlotOps);
      }

      // 4. Cleanup removed slots
      // Delete any slots in this floor that are not in the validSlotNames list
      await Slot.deleteMany({
        floorID: id,
        slotNumber: { $nin: validSlotNames }
      });
    }

    // Finally, update the Floor's layoutData for frontend rendering
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

// Get all slots for a specific floor
exports.getFloorSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const slots = await Slot.find({ floorID: id }).populate('zoneID', 'zoneName zoneType');
    res.status(200).json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const TicketPackage = require('../models/TicketPackage');

// Lấy danh sách các gói cước đang active (Dành cho Customer/Kiosk)
exports.getActivePackages = async (req, res) => {
  try {
    const packages = await TicketPackage.find({ isActive: true }).sort({ type: -1, price: 1 });
    res.status(200).json({ success: true, data: packages });
  } catch (error) {
    console.error('Error fetching active ticket packages:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách gói cước' });
  }
};

// Lấy toàn bộ gói cước (Dành cho Admin)
exports.getAllPackages = async (req, res) => {
  try {
    const packages = await TicketPackage.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: packages });
  } catch (error) {
    console.error('Error fetching all ticket packages:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách gói cước' });
  }
};

// Lấy chi tiết 1 gói cước
exports.getPackageById = async (req, res) => {
  try {
    const ticketPackage = await TicketPackage.findById(req.params.id);
    if (!ticketPackage) return res.status(404).json({ success: false, message: 'Không tìm thấy gói cước' });
    res.status(200).json({ success: true, data: ticketPackage });
  } catch (error) {
    console.error('Error fetching ticket package:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Tạo gói cước mới (Dành cho Admin)
exports.createPackage = async (req, res) => {
  try {
    const { name, type, price, description, isActive } = req.body;
    const newPackage = new TicketPackage({ name, type, price, description, isActive });
    await newPackage.save();
    res.status(201).json({ success: true, data: newPackage });
  } catch (error) {
    console.error('Error creating ticket package:', error);
    res.status(500).json({ message: 'Lỗi server khi tạo gói cước', error: error.message, stack: error.stack });
  }
};

// Cập nhật gói cước (Dành cho Admin)
exports.updatePackage = async (req, res) => {
  try {
    const { name, type, price, description, isActive } = req.body;
    const updatedPackage = await TicketPackage.findByIdAndUpdate(
      req.params.id,
      { name, type, price, description, isActive },
      { new: true, runValidators: true }
    );
    if (!updatedPackage) return res.status(404).json({ success: false, message: 'Không tìm thấy gói cước' });
    res.status(200).json({ success: true, data: updatedPackage });
  } catch (error) {
    console.error('Error updating ticket package:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật gói cước' });
  }
};

// Xóa gói cước (Dành cho Admin)
exports.deletePackage = async (req, res) => {
  try {
    const deletedPackage = await TicketPackage.findByIdAndDelete(req.params.id);
    if (!deletedPackage) return res.status(404).json({ success: false, message: 'Không tìm thấy gói cước' });
    res.status(200).json({ success: true, message: 'Xóa gói cước thành công' });
  } catch (error) {
    console.error('Error deleting ticket package:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa gói cước' });
  }
};

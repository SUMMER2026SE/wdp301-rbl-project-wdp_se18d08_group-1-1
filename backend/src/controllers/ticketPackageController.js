const mongoose = require("mongoose");
const PackageType = require("../models/PackageType");
const TicketPackage = require("../models/TicketPackage");

const allowedIcons = [
  "Ticket",
  "Clock",
  "Calendar",
  "Car",
  "Shield",
  "AlertTriangle",
  "QrCode",
  "ParkingCircle",
];
const allowedPackageTypePricingModes = ["Hourly", "Monthly"];

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const trimString = (value) => String(value || "").trim();

const isPositive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const isNonNegative = (value) =>
  Number.isFinite(Number(value)) && Number(value) >= 0;
const isPositiveInteger = (value) =>
  Number.isInteger(Number(value)) && Number(value) > 0;

const nextPackageCode = async () => {
  const latest = await TicketPackage.findOne({ code: /^PKG-\d{3}$/ })
    .sort({ code: -1 })
    .select("code")
    .lean();
  const next = latest?.code ? Number(latest.code.replace("PKG-", "")) + 1 : 1;
  return `PKG-${String(next).padStart(3, "0")}`;
};

const findPackageType = async (body) => {
  if (body.packageTypeId && mongoose.isValidObjectId(body.packageTypeId)) {
    return PackageType.findById(body.packageTypeId);
  }
  if (body.packageTypeName) {
    return PackageType.findOne({
      name: new RegExp(`^${trimString(body.packageTypeName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
  }
  return null;
};

const buildValidationError = (errors) => ({
  success: false,
  message: errors[0]?.message || "Validation failed.",
  errors,
});

const validatePackagePayload = async (body, existingId = null) => {
  const errors = [];
  const packageType = await findPackageType(body);
  const name = trimString(body.name);
  const code = trimString(body.code).toUpperCase();
  const status = body.status;
  const appliesTo = body.appliesTo;

  if (!name) errors.push({ field: "name", message: "Package name is required." });
  else if (name.length < 3)
    errors.push({ field: "name", message: "Package name must be at least 3 characters." });
  else if (name.length > 80)
    errors.push({ field: "name", message: "Package name must be 80 characters or less." });

  if (code && !/^PKG-\d{3}$/.test(code)) {
    errors.push({ field: "code", message: "Package code must use PKG-XXX format." });
  }

  if (code) {
    const duplicate = await TicketPackage.findOne({
      code,
      ...(existingId ? { _id: { $ne: existingId } } : {}),
    }).lean();
    if (duplicate) errors.push({ field: "code", message: "Package code already exists." });
  }

  if (!packageType) {
    errors.push({ field: "type", message: "Package type is required." });
  }
  if (!["Guest", "Customer", "All"].includes(appliesTo)) {
    errors.push({ field: "appliesTo", message: "Applies to is required." });
  }
  if (!["Active", "Inactive"].includes(status)) {
    errors.push({ field: "status", message: "Status is required." });
  }

  if (!packageType) return { errors, packageType: null };

  if (packageType.name === "Guest Hourly" && appliesTo !== "Guest") {
    errors.push({ field: "appliesTo", message: "Guest Hourly must apply to Guest." });
  }
  if (
    ["Customer Hourly", "Monthly Pass"].includes(packageType.name) &&
    appliesTo !== "Customer"
  ) {
    errors.push({
      field: "appliesTo",
      message: `${packageType.name} must apply to Customer.`,
    });
  }
  if (packageType.name === "Fee Rule") {
    errors.push({ field: "type", message: "Fee Rule is no longer supported for ticket packages." });
  }

  const firstBlockPrice = toNumber(body.firstBlockPrice ?? body.basePrice);
  const firstBlockDuration = toNumber(body.firstBlockDuration ?? body.duration);
  const nextBlockPrice = toNumber(body.nextBlockPrice);
  const nextBlockDuration = toNumber(body.nextBlockDuration);
  const basePrice = toNumber(body.basePrice ?? body.firstBlockPrice);
  const duration = toNumber(body.duration ?? body.firstBlockDuration);
  const monthlyPrice = toNumber(body.monthlyPrice);
  const durationDays = toNumber(body.durationDays);
  const vehicleLimit = toNumber(body.vehicleLimit, 1);
  const overtimeFee = toNumber(body.overtimeFee);
  const feeDescription = trimString(body.feeDescription ?? body.description);

  if (packageType.name === "Guest Hourly") {
    if (!isPositive(firstBlockPrice))
      errors.push({ field: "basePrice", message: "First block price must be greater than 0." });
    if (!isPositiveInteger(firstBlockDuration))
      errors.push({ field: "firstBlockDuration", message: "First block duration must be greater than 0 minutes." });
    if (!isPositive(nextBlockPrice))
      errors.push({ field: "nextBlockPrice", message: "Next block price must be greater than 0." });
    if (!isPositiveInteger(nextBlockDuration))
      errors.push({ field: "nextBlockDuration", message: "Next block duration must be greater than 0 minutes." });
  } else if (packageType.pricingMode === "Hourly") {
    if (!isPositive(basePrice))
      errors.push({ field: "basePrice", message: "Base price must be greater than 0." });
    if (!isPositiveInteger(duration))
      errors.push({ field: "firstBlockDuration", message: "Duration must be greater than 0 minutes." });
    if (!isNonNegative(overtimeFee))
      errors.push({ field: "overtimeFee", message: "Overtime fee must be 0 or greater." });
  } else if (packageType.pricingMode === "Monthly") {
    if (!isPositive(monthlyPrice))
      errors.push({ field: "monthlyPrice", message: "Monthly price must be greater than 0." });
    if (body.durationDays !== undefined && !isPositiveInteger(durationDays))
      errors.push({ field: "durationDays", message: "Duration in days must be greater than 0." });
    if (!isPositiveInteger(vehicleLimit))
      errors.push({ field: "vehicleLimit", message: "Vehicle limit must be at least 1." });
  }

  return { errors, packageType };
};

const buildPackageData = async (body, packageType, existingCode) => {
  const code = trimString(body.code).toUpperCase() || existingCode || (await nextPackageCode());
  const firstBlockPrice = toNumber(body.firstBlockPrice ?? body.basePrice);
  const firstBlockDuration = toNumber(body.firstBlockDuration ?? body.duration);
  const basePrice = toNumber(body.basePrice ?? body.firstBlockPrice);
  const duration = toNumber(body.duration ?? body.firstBlockDuration);
  const feeDescription = trimString(body.feeDescription ?? body.description);

  return {
    code,
    name: trimString(body.name),
    packageTypeId: packageType._id,
    packageTypeName: packageType.name,
    appliesTo: body.appliesTo,
    status: body.status || "Active",
    pricingMode: packageType.pricingMode,
    firstBlockPrice,
    firstBlockDuration,
    nextBlockPrice: toNumber(body.nextBlockPrice),
    nextBlockDuration: toNumber(body.nextBlockDuration),
    basePrice,
    duration,
    durationDays: toNumber(body.durationDays, packageType.pricingMode === "Monthly" ? 30 : 0),
    monthlyPrice: toNumber(body.monthlyPrice),
    vehicleLimit: toNumber(body.vehicleLimit, 1),
    overtimeFee: toNumber(body.overtimeFee),
    feeDescription,
    fixedSlotEnabled: Boolean(body.fixedSlotEnabled ?? body.fixedSlot),
    unlimitedEntryEnabled: Boolean(body.unlimitedEntryEnabled ?? body.unlimitedEntry),
    icon: body.icon || packageType.icon,
  };
};

exports.getPackageTypes = async (_req, res, next) => {
  try {
    const packageTypes = await PackageType.find({ name: { $ne: "Fee Rule" } }).sort({ isDefault: -1, createdAt: 1 });
    res.status(200).json({
      success: true,
      count: packageTypes.length,
      data: packageTypes,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPackageTypeById = async (req, res, next) => {
  try {
    const packageType = await PackageType.findById(req.params.id);
    if (!packageType) {
      return res.status(404).json({ success: false, message: "Package type not found." });
    }

    res.status(200).json({ success: true, data: packageType });
  } catch (error) {
    next(error);
  }
};

exports.createPackageType = async (req, res, next) => {
  try {
    const name = trimString(req.body.name);
    const pricingMode = req.body.pricingMode;
    const icon = req.body.icon || "Ticket";
    const errors = [];

    if (!name) errors.push({ field: "name", message: "Type name is required." });
    else if (name.length < 3) errors.push({ field: "name", message: "Type name must be at least 3 characters." });
    else if (name.length > 50) errors.push({ field: "name", message: "Type name must be 50 characters or less." });
    else if (name.toLowerCase() === "fee rule") errors.push({ field: "name", message: "Fee Rule package type is no longer supported." });
    if (!pricingMode || !allowedPackageTypePricingModes.includes(pricingMode)) {
      errors.push({ field: "pricingMode", message: "Pricing mode is required." });
    }
    if (!icon || !allowedIcons.includes(icon)) {
      errors.push({ field: "icon", message: "Icon is required." });
    }

    const duplicate = name
      ? await PackageType.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).lean()
      : null;
    if (duplicate) errors.push({ field: "name", message: "Type name must be unique." });

    if (errors.length) return res.status(400).json(buildValidationError(errors));

    const packageType = await PackageType.create({
      name,
      description: trimString(req.body.description),
      icon,
      pricingMode,
      isDefault: false,
    });

    res.status(201).json({
      success: true,
      message: "Package type created successfully.",
      data: packageType,
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePackageType = async (req, res, next) => {
  try {
    const packageType = await PackageType.findById(req.params.id);
    if (!packageType) return res.status(404).json({ success: false, message: "Package type not found." });

    const updates = {};
    const errors = [];

    if (packageType.isDefault) {
      if (
        req.body.name !== undefined &&
        trimString(req.body.name).toLowerCase() !== packageType.name.toLowerCase()
      ) {
        errors.push({ field: "name", message: "Default package type name cannot be changed." });
      }
      if (
        req.body.pricingMode !== undefined &&
        req.body.pricingMode !== packageType.pricingMode
      ) {
        errors.push({ field: "pricingMode", message: "Default package type pricing mode cannot be changed." });
      }
    } else {
      if (req.body.name !== undefined) {
        const name = trimString(req.body.name);
        if (!name) errors.push({ field: "name", message: "Type name is required." });
        else if (name.length < 3) errors.push({ field: "name", message: "Type name must be at least 3 characters." });
        else if (name.length > 50) errors.push({ field: "name", message: "Type name must be 50 characters or less." });
        else if (name.toLowerCase() === "fee rule") errors.push({ field: "name", message: "Fee Rule package type is no longer supported." });
        else {
          const duplicate = await PackageType.findOne({
            _id: { $ne: packageType._id },
            name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
          }).lean();
          if (duplicate) errors.push({ field: "name", message: "Type name must be unique." });
          updates.name = name;
        }
      }

      if (req.body.pricingMode !== undefined) {
        if (!allowedPackageTypePricingModes.includes(req.body.pricingMode)) {
          errors.push({ field: "pricingMode", message: "Pricing mode is required." });
        } else {
          updates.pricingMode = req.body.pricingMode;
        }
      }
    }

    if (req.body.icon !== undefined) {
      const icon = req.body.icon;
      if (!icon || !allowedIcons.includes(icon)) {
        errors.push({ field: "icon", message: "Icon is required." });
      } else {
        updates.icon = icon;
      }
    }

    if (req.body.description !== undefined) {
      updates.description = trimString(req.body.description);
    }

    if (errors.length) return res.status(400).json(buildValidationError(errors));

    const updated = await PackageType.findByIdAndUpdate(packageType._id, updates, {
      new: true,
      runValidators: true,
    });

    if (updates.name || updates.pricingMode || updates.icon) {
      await TicketPackage.updateMany(
        { packageTypeId: updated._id },
        {
          $set: {
            packageTypeName: updated.name,
            pricingMode: updated.pricingMode,
            icon: updated.icon,
          },
        },
      );
    }

    res.status(200).json({ success: true, message: "Package type updated successfully.", data: updated });
  } catch (error) {
    next(error);
  }
};

exports.deletePackageType = async (req, res, next) => {
  try {
    const type = await PackageType.findById(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: "Package type not found." });
    if (type.isDefault) {
      return res.status(400).json({ success: false, message: "Default package types cannot be deleted." });
    }

    const usageCount = await TicketPackage.countDocuments({ packageTypeId: type._id });
    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete this package type because ${usageCount} ticket package(s) are using it.`,
      });
    }

    await type.deleteOne();
    res.status(200).json({ success: true, message: "Package type deleted successfully.", data: {} });
  } catch (error) {
    next(error);
  }
};

exports.getTicketPackages = async (req, res, next) => {
  try {
    const filter = { packageTypeName: { $ne: "Fee Rule" } };
    if (req.query.status && ["Active", "Inactive"].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.packageTypeId && mongoose.isValidObjectId(req.query.packageTypeId)) {
      filter.packageTypeId = req.query.packageTypeId;
    }
    if (req.query.search) {
      const term = trimString(req.query.search);
      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { code: { $regex: term, $options: "i" } },
      ];
    }

    const packages = await TicketPackage.find(filter)
      .populate("packageTypeId")
      .sort({ updatedAt: -1 });
    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTicketPackageById = async (req, res, next) => {
  try {
    const ticketPackage = await TicketPackage.findById(req.params.id).populate("packageTypeId");
    if (!ticketPackage) {
      return res.status(404).json({ success: false, message: "Ticket package not found." });
    }
    res.status(200).json({ success: true, data: ticketPackage });
  } catch (error) {
    next(error);
  }
};

exports.createTicketPackage = async (req, res, next) => {
  try {
    const { errors, packageType } = await validatePackagePayload(req.body);
    if (errors.length) return res.status(400).json(buildValidationError(errors));

    const data = await buildPackageData(req.body, packageType);
    const ticketPackage = await TicketPackage.create(data);
    await ticketPackage.populate("packageTypeId");

    res.status(201).json({
      success: true,
      message: "Ticket package created.",
      data: ticketPackage,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTicketPackage = async (req, res, next) => {
  try {
    const existing = await TicketPackage.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Ticket package not found." });
    }

    const mergedBody = { ...existing.toObject(), ...req.body };
    const { errors, packageType } = await validatePackagePayload(mergedBody, existing._id);
    if (errors.length) return res.status(400).json(buildValidationError(errors));

    const data = await buildPackageData(mergedBody, packageType, existing.code);
    const ticketPackage = await TicketPackage.findByIdAndUpdate(existing._id, data, {
      new: true,
      runValidators: true,
    }).populate("packageTypeId");

    res.status(200).json({
      success: true,
      message: "Ticket package updated.",
      data: ticketPackage,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteTicketPackage = async (req, res, next) => {
  try {
    const ticketPackage = await TicketPackage.findByIdAndDelete(req.params.id);
    if (!ticketPackage) {
      return res.status(404).json({ success: false, message: "Ticket package not found." });
    }

    res.status(200).json({
      success: true,
      message: "Ticket package deleted.",
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

exports.getTicketPackageStats = async (_req, res, next) => {
  try {
    const [total, hourly, monthly, active] = await Promise.all([
      TicketPackage.countDocuments(),
      TicketPackage.countDocuments({ pricingMode: "Hourly" }),
      TicketPackage.countDocuments({ pricingMode: "Monthly" }),
      TicketPackage.countDocuments({ status: "Active" }),
    ]);

    res.status(200).json({
      success: true,
      data: { total, hourly, monthly, active },
    });
  } catch (error) {
    next(error);
  }
};

const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Session = require('../models/Session');
const {
  normalizeLicensePlate,
  formatLicensePlateDisplay,
} = require('../utils/licensePlateUtils');

dotenv.config();

const collections = [
  { name: 'Vehicle', model: Vehicle },
  { name: 'Booking', model: Booking },
  { name: 'Session', model: Session },
];

const runCollectionMigration = async ({ name, model }) => {
  const docs = await model.find({ licensePlate: { $exists: true, $ne: null } }).lean();
  const normalizedMap = new Map();
  const updates = [];
  const conflicts = [];

  for (const doc of docs) {
    const current = String(doc.licensePlate || '');
    const normalized = normalizeLicensePlate(current);

    if (!normalized) {
      continue;
    }

    const bucket = normalizedMap.get(normalized) || [];
    bucket.push({ _id: doc._id.toString(), current });
    normalizedMap.set(normalized, bucket);
  }

  for (const doc of docs) {
    const current = String(doc.licensePlate || '');
    const normalized = normalizeLicensePlate(current);

    if (!normalized || normalized === current) {
      continue;
    }

    const bucket = normalizedMap.get(normalized) || [];
    if (bucket.length > 1) {
      conflicts.push({
        _id: doc._id.toString(),
        current,
        normalized,
      });
      continue;
    }

    updates.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { licensePlate: normalized } },
      },
    });
  }

  if (updates.length > 0) {
    await model.bulkWrite(updates, { ordered: false });
  }

  console.log(`[${name}] Total records: ${docs.length}`);
  console.log(`[${name}] Updated records: ${updates.length}`);

  if (conflicts.length > 0) {
    console.log(`[${name}] Conflicts found after normalization:`);
    conflicts.forEach((item) => {
      console.log(
        `  - ${item._id}: ${item.current} -> ${item.normalized} (duplicate normalized plate)`
      );
    });
  }
};

const main = async () => {
  await connectDB();

  for (const collection of collections) {
    await runCollectionMigration(collection);
  }

  const sample = formatLicensePlateDisplay('29H76919');
  console.log(`Sample display format: ${sample}`);
  console.log('License plate normalization migration completed.');
  process.exit(0);
};

main().catch((error) => {
  console.error('License plate normalization migration failed:', error);
  process.exit(1);
});

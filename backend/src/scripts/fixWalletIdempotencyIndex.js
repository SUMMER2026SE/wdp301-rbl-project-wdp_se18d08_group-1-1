const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const WalletTransaction = require('../models/WalletTransaction');

dotenv.config();

const INDEX_NAME = 'idempotencyKey_1';

const run = async () => {
  await connectDB();

  const collection = WalletTransaction.collection;
  const cleanup = await collection.updateMany(
    {
      $or: [
        { idempotencyKey: null },
        { idempotencyKey: '' },
      ],
    },
    { $unset: { idempotencyKey: '' } }
  );

  const indexes = await collection.indexes();
  const currentIndex = indexes.find((index) => index.name === INDEX_NAME);
  const hasExpectedFilter =
    currentIndex?.unique === true &&
    currentIndex?.partialFilterExpression?.idempotencyKey?.$type === 'string';

  if (currentIndex && !hasExpectedFilter) {
    await collection.dropIndex(INDEX_NAME);
  }

  if (!hasExpectedFilter) {
    await collection.createIndex(
      { idempotencyKey: 1 },
      {
        name: INDEX_NAME,
        unique: true,
        partialFilterExpression: { idempotencyKey: { $type: 'string' } },
      }
    );
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        unsetNullOrEmptyKeys: cleanup.modifiedCount,
        index: INDEX_NAME,
        mode: 'unique-partial-string-only',
      },
      null,
      2
    )
  );
};

run()
  .catch((error) => {
    console.error('[WalletIdempotencyMigration] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

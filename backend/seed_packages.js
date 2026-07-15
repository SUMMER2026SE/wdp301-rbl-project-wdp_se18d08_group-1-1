const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '/Users/vodaivy/FPT University/WDP301/ValoParking/backend/.env' });

const TicketPackage = require('/Users/vodaivy/FPT University/WDP301/ValoParking/backend/src/models/TicketPackage');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    const packages = [
      { name: 'Standard Hourly', type: 'hourly', price: 10000, description: 'Basic hourly parking', isActive: true },
      { name: 'Premium Monthly', type: 'monthly', price: 500000, description: 'Monthly subscription with priority', isActive: true },
      { name: 'VIP Yearly', type: 'yearly', price: 5000000, description: 'VIP yearly package', isActive: true }
    ];
    await TicketPackage.insertMany(packages);
    console.log('Packages seeded successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

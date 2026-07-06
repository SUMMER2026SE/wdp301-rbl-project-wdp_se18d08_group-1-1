const ContractTerms = require('../models/ContractTerms');

const DEFAULT_TERMS = {
  MONTHLY_PASS: 'Monthly parking contract for {customerName}, vehicle {vehiclePlate}, slot {slotCode}, from {startDate} to {endDate}. Total amount: {totalAmount}.',
  YEARLY_PASS: 'Yearly parking contract for {customerName}, vehicle {vehiclePlate}, slot {slotCode}, from {startDate} to {endDate}. Total amount: {totalAmount}.',
  TRANSFER: 'Transferred parking contract for {customerName}, vehicle {vehiclePlate}, slot {slotCode}, from {startDate} to {endDate}. Total amount: {totalAmount}.',
};

const formatDate = (date) => (date ? new Date(date).toLocaleDateString('vi-VN') : '');
const formatCurrency = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} VND`;

async function getTemplate(type) {
  let template = await ContractTerms.findOne({ type, isActive: true }).sort({ version: -1 }).lean();
  if (!template) {
    template = {
      type,
      version: 1,
      content: DEFAULT_TERMS[type] || DEFAULT_TERMS.MONTHLY_PASS,
      isActive: true,
    };
  }
  return template;
}

async function updateTemplate(type, content, adminId) {
  const current = await ContractTerms.findOne({ type, isActive: true }).sort({ version: -1 });
  const nextVersion = current ? current.version + 1 : 1;

  if (current) {
    current.isActive = false;
    await current.save();
  }

  return ContractTerms.create({
    type,
    version: nextVersion,
    content,
    createdBy: adminId,
    isActive: true,
  });
}

async function getTemplateHistory(type) {
  return ContractTerms.find({ type }).sort({ version: -1, createdAt: -1 }).populate('createdBy', 'username email').lean();
}

function replacePlaceholders(template, data = {}) {
  const values = {
    customerName: data.customerName || '',
    vehiclePlate: data.vehiclePlate || '',
    startDate: formatDate(data.startDate),
    endDate: formatDate(data.endDate),
    totalAmount: formatCurrency(data.totalAmount),
    slotCode: data.slotCode || '',
    contractCode: data.contractCode || '',
  };

  return Object.entries(values).reduce(
    (content, [key, value]) => content.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template || ''
  );
}

module.exports = {
  getTemplate,
  updateTemplate,
  getTemplateHistory,
  replacePlaceholders,
  formatDate,
  formatCurrency,
};

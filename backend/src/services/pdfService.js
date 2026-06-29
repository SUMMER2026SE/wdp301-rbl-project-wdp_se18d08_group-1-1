const { formatCurrency, formatDate } = require('./contractTermsService');

const escapePdfText = (value) => String(value ?? '')
  .replace(/[\\()]/g, '\\$&')
  .replace(/[^\x20-\x7E]/g, '?');

const buildPdf = (lines) => {
  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const font = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const contentLines = lines.map((line, index) => `BT /F1 10 Tf 50 ${790 - index * 16} Td (${escapePdfText(line)}) Tj ET`);
  const stream = contentLines.join('\n');
  const content = addObject(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  const page = addObject(`<< /Type /Page /Parent 4 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`);
  const pages = addObject(`<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`);
  const catalog = addObject(`<< /Type /Catalog /Pages ${pages} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
};

async function generateContractPDF(contract) {
  if (contract.status === 'DRAFT') {
    throw Object.assign(new Error('Khong the xuat PDF cho hop dong nhap'), { statusCode: 400 });
  }

  const watermark = contract.status === 'CANCELLED'
    ? 'DA HUY'
    : contract.status === 'EXPIRED'
      ? 'HET HAN'
      : '';

  const user = contract.userId || {};
  const vehicle = contract.vehicleId || {};
  const booking = contract.bookingId || {};
  const lines = [
    'VALO PARKING - HOP DONG DICH VU DO XE',
    watermark ? `WATERMARK: ${watermark}` : '',
    `Ma hop dong: ${contract.contractCode}`,
    `Ngay tao: ${formatDate(contract.createdAt)}`,
    `Trang thai: ${contract.status}`,
    `Loai hop dong: ${contract.type}`,
    `Khach hang: ${user.username || ''}`,
    `Email: ${user.email || ''}`,
    `Bien so xe: ${vehicle.licensePlate || booking.licensePlate || ''}`,
    `Loai xe: ${vehicle.vehicleType || ''}`,
    `Vi tri do: ${contract.slotCode}`,
    `Thoi han: ${formatDate(contract.startTime)} - ${formatDate(contract.endTime)}`,
    `Tong tien: ${formatCurrency(contract.totalAmount)}`,
    `Thanh toan: ${contract.paymentStatus}`,
    'Dieu khoan:',
    ...(String(contract.terms || '').match(/.{1,90}/g) || ['']),
    '',
    'Dai dien VALO Parking                         Khach hang',
  ].filter((line) => line !== '');

  return buildPdf(lines.slice(0, 46));
}

module.exports = {
  generateContractPDF,
  formatCurrency,
  formatDate,
};

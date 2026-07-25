const PDFDocument = require('pdfkit');
const { formatCurrency, formatDate } = require('./contractTermsService');

// Use complete TrueType fonts. Fontsource's web subsets are intentionally split by
// Unicode range and therefore render missing glyph boxes when embedded in a PDF.
const FONT_REGULAR = require.resolve(
  'dejavu-fonts-ttf/ttf/DejaVuSerif.ttf'
);
const FONT_BOLD = require.resolve(
  'dejavu-fonts-ttf/ttf/DejaVuSerif-Bold.ttf'
);
const PAGE = {
  size: 'A4',
  margins: { top: 48, right: 54, bottom: 58, left: 54 },
};
const INK = '#151515';
const MUTED = '#5C5C5C';
const BORDER = '#B8B8B8';
const PANEL = '#F7F7F5';

const createPdf = (render) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: PAGE.size,
      margins: PAGE.margins,
      bufferPages: true,
      info: {
        Title: 'Hợp đồng VALO Parking',
        Author: 'VALO Parking',
      },
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    try {
      doc.registerFont('NotoSerif', FONT_REGULAR);
      doc.registerFont('NotoSerifBold', FONT_BOLD);
      doc.font('NotoSerif').fillColor(INK);
      render(doc);
      addPageNumbers(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });

const contentWidth = (doc) =>
  doc.page.width - doc.page.margins.left - doc.page.margins.right;

const ensureSpace = (doc, requiredHeight) => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + requiredHeight > bottom) doc.addPage();
};

const addPageNumbers = (doc) => {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const footerY = doc.page.height - 34;
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .save()
      .strokeColor('#D6D6D6')
      .lineWidth(0.6)
      .moveTo(doc.page.margins.left, footerY - 8)
      .lineTo(doc.page.width - doc.page.margins.right, footerY - 8)
      .stroke()
      .font('NotoSerif')
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `Trang ${index - range.start + 1}/${range.count}`,
        doc.page.margins.left,
        footerY,
        { width: contentWidth(doc), align: 'center', lineBreak: false }
      )
      .restore();
    doc.page.margins.bottom = originalBottomMargin;
  }
};

const drawSectionHeading = (doc, title) => {
  ensureSpace(doc, 42);
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  doc.x = left;
  doc.moveDown(0.7);
  doc
    .font('NotoSerifBold')
    .fontSize(11)
    .fillColor(INK)
    .text(title, left, doc.y, { width, align: 'left', lineGap: 1 });
  doc
    .strokeColor(INK)
    .lineWidth(0.7)
    .moveTo(left, doc.y + 2)
    .lineTo(left + 64, doc.y + 2)
    .stroke();
  doc.x = left;
  doc.moveDown(0.45);
};

const drawParagraph = (doc, text, options = {}) => {
  if (!text) return;
  const left = doc.page.margins.left;
  doc
    .font(options.bold ? 'NotoSerifBold' : 'NotoSerif')
    .fontSize(options.size || 10)
    .fillColor(INK)
    .text(text, left, doc.y, {
      width: contentWidth(doc),
      align: options.align || 'justify',
      indent: options.indent || 0,
      lineGap: options.lineGap ?? 2.2,
    });
  doc.x = left;
  doc.moveDown(options.after ?? 0.3);
};

const drawNumberedItems = (doc, items) => {
  items.filter(Boolean).forEach((item, index) => {
    ensureSpace(doc, 30);
    drawParagraph(doc, `${index + 1}. ${item}`, { indent: 12, after: 0.2 });
  });
};

const drawPartyBox = (doc, title, party) => {
  const rows = [
    party?.username ? ['Họ và tên / Tên tài khoản:', party.username] : null,
    party?.email ? ['Email:', party.email] : null,
  ].filter(Boolean);
  if (!rows.length) return;

  const height = 40 + rows.length * 20;
  ensureSpace(doc, height + 12);
  const x = doc.page.margins.left;
  const y = doc.y;
  const width = contentWidth(doc);
  doc
    .save()
    .roundedRect(x, y, width, height, 3)
    .fillAndStroke(PANEL, BORDER)
    .restore();
  doc
    .font('NotoSerifBold')
    .fontSize(10.5)
    .fillColor(INK)
    .text(title, x + 14, y + 11, { width: width - 28 });

  let rowY = y + 34;
  rows.forEach(([label, value]) => {
    doc
      .font('NotoSerifBold')
      .fontSize(9.5)
      .text(label, x + 14, rowY, { width: 176, lineBreak: false });
    doc
      .font('NotoSerif')
      .fontSize(9.5)
      .text(String(value), x + 190, rowY, {
        width: width - 204,
        lineBreak: false,
    });
    rowY += 20;
  });
  doc.x = x;
  doc.y = y + height + 10;
};

const drawKeyValueRows = (doc, rows) => {
  const usableWidth = contentWidth(doc) - 24;
  rows.filter((row) => row?.[1] !== undefined && row?.[1] !== null && row?.[1] !== '')
    .forEach(([label, value, emphasized]) => {
      const valueText = String(value);
      doc.font(emphasized ? 'NotoSerifBold' : 'NotoSerif').fontSize(9.7);
      const rowHeight = Math.max(
        19,
        doc.heightOfString(valueText, { width: usableWidth - 168, lineGap: 1.5 })
      );
      ensureSpace(doc, rowHeight + 4);
      const y = doc.y;
      doc
        .font('NotoSerifBold')
        .fontSize(9.7)
        .text(label, doc.page.margins.left + 12, y, {
          width: 156,
          lineGap: 1.5,
        });
      doc
        .font(emphasized ? 'NotoSerifBold' : 'NotoSerif')
        .fontSize(9.7)
        .text(valueText, doc.page.margins.left + 180, y, {
          width: usableWidth - 168,
          lineGap: 1.5,
        });
      doc.x = doc.page.margins.left;
      doc.y = y + rowHeight + 2;
    });
};

const drawSignatureBlock = (doc, data) => {
  ensureSpace(doc, 132);
  doc.moveDown(0.8);
  const x = doc.page.margins.left;
  const width = contentWidth(doc);
  const columnWidth = width / 2;
  const y = doc.y;
  [
    ['ĐẠI DIỆN BÊN A', '(Ký và ghi rõ họ tên)', data.fromUser?.username],
    ['ĐẠI DIỆN BÊN B', '(Ký và ghi rõ họ tên)', data.toUser?.username],
  ].forEach(([title, note, name], index) => {
    const columnX = x + index * columnWidth;
    doc
      .font('NotoSerifBold')
      .fontSize(10)
      .text(title, columnX, y, { width: columnWidth, align: 'center' });
    doc
      .font('NotoSerif')
      .fontSize(8.5)
      .fillColor(MUTED)
      .text(note, columnX, y + 19, { width: columnWidth, align: 'center' });
    if (name) {
      doc
        .font('NotoSerifBold')
        .fontSize(9.5)
        .fillColor(INK)
        .text(name, columnX, y + 92, { width: columnWidth, align: 'center' });
    }
  });
  doc.x = x;
  doc.y = y + 116;
};

const buildTransferAgreementPdf = (data) =>
  createPdf((doc) => {
    const width = contentWidth(doc);
    doc
      .font('NotoSerifBold')
      .fontSize(12)
      .text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { align: 'center' })
      .moveDown(0.18)
      .fontSize(10.5)
      .text('Độc lập – Tự do – Hạnh phúc', { align: 'center' });
    const underlineY = doc.y + 3;
    doc
      .strokeColor(INK)
      .lineWidth(0.7)
      .moveTo(doc.page.width / 2 - 62, underlineY)
      .lineTo(doc.page.width / 2 + 62, underlineY)
      .stroke();

    doc.moveDown(1.25);
    if (data.completedAt) {
      doc
        .font('NotoSerif')
        .fontSize(9.5)
        .text(`Ngày ${formatDate(data.completedAt)}`, {
          width,
          align: 'right',
        });
      doc.moveDown(0.7);
    }

    doc
      .font('NotoSerifBold')
      .fontSize(15)
      .text('HỢP ĐỒNG CHUYỂN NHƯỢNG', { align: 'center', characterSpacing: 0.4 })
      .moveDown(0.12)
      .fontSize(13)
      .text('QUYỀN SỬ DỤNG CHỖ ĐỖ XE', { align: 'center', characterSpacing: 0.25 });
    if (data.contractNumber) {
      doc
        .moveDown(0.45)
        .font('NotoSerif')
        .fontSize(9.5)
        .text(`Số: ${data.contractNumber}`, { align: 'center' });
    }
    if (data.packageName) {
      doc
        .moveDown(0.15)
        .fontSize(9.5)
        .text(`Loại quyền sử dụng: ${data.packageName}`, { align: 'center' });
    }
    doc.moveDown(1);

    drawParagraph(
      doc,
      'Hôm nay, các bên tự nguyện thỏa thuận và đồng ý ký kết Hợp đồng chuyển nhượng quyền sử dụng chỗ đỗ xe với các nội dung sau:',
      { after: 0.65 }
    );
    drawPartyBox(doc, 'BÊN CHUYỂN NHƯỢNG (BÊN A)', data.fromUser);
    drawPartyBox(doc, 'BÊN NHẬN CHUYỂN NHƯỢNG (BÊN B)', data.toUser);

    drawSectionHeading(doc, 'ĐIỀU 1. ĐỐI TƯỢNG CỦA HỢP ĐỒNG');
    drawParagraph(
      doc,
      'Bên A đồng ý chuyển nhượng và Bên B đồng ý nhận quyền sử dụng chỗ đỗ xe trong thời hạn còn lại với thông tin sau:'
    );
    drawKeyValueRows(doc, [
      ['Bãi đỗ xe:', data.parkingLot?.name],
      ['Địa chỉ bãi:', data.parkingLot?.address],
      ['Tầng:', data.floorName],
      ['Mã chỗ đỗ:', data.slotCode],
      ['Thời hạn sử dụng:', data.validFrom && data.expireAt
        ? `Từ ngày ${formatDate(data.validFrom)} đến hết ngày ${formatDate(data.expireAt)}`
        : data.expireAt ? `Đến hết ngày ${formatDate(data.expireAt)}` : null],
    ]);

    drawSectionHeading(doc, 'ĐIỀU 2. GIÁ CHUYỂN NHƯỢNG VÀ THANH TOÁN');
    drawKeyValueRows(doc, [
      ['Giá chuyển nhượng:', formatCurrency(data.askingPrice)],
      ['Phí xử lý:', formatCurrency(data.transferFee)],
      ['Tổng thanh toán:', formatCurrency(data.totalDue), true],
      ['Phương thức:', data.paymentMethod],
      ['Hoàn tất thanh toán:', data.completedAt ? formatDate(data.completedAt) : null],
    ]);

    drawSectionHeading(doc, 'ĐIỀU 3. THỜI GIAN BÀN GIAO');
    drawParagraph(
      doc,
      data.completedAt
        ? `Quyền sử dụng chỗ đỗ xe được bàn giao cho Bên B kể từ ngày ${formatDate(data.completedAt)}.`
        : 'Quyền sử dụng chỗ đỗ xe được bàn giao sau khi giao dịch hoàn tất.'
    );

    drawSectionHeading(doc, 'ĐIỀU 4. QUYỀN VÀ NGHĨA VỤ CỦA BÊN A');
    drawNumberedItems(doc, [
      'Cam kết có quyền chuyển nhượng quyền sử dụng chỗ đỗ xe nêu tại Điều 1.',
      'Bàn giao quyền sử dụng đúng thông tin và thời hạn đã thỏa thuận.',
      'Chấm dứt quyền sử dụng chỗ đỗ xe kể từ thời điểm bàn giao.',
    ]);

    drawSectionHeading(doc, 'ĐIỀU 5. QUYỀN VÀ NGHĨA VỤ CỦA BÊN B');
    drawNumberedItems(doc, [
      'Thanh toán đầy đủ giá chuyển nhượng và phí xử lý.',
      'Tiếp nhận và sử dụng chỗ đỗ xe theo đúng quy định của VALO Parking.',
      'Tự chịu trách nhiệm về việc sử dụng kể từ thời điểm nhận bàn giao.',
    ]);

    drawSectionHeading(doc, 'ĐIỀU 6. GIẢI QUYẾT TRANH CHẤP');
    drawParagraph(
      doc,
      'Mọi tranh chấp phát sinh được ưu tiên giải quyết bằng thương lượng. Nếu thương lượng không thành, một trong hai bên có quyền yêu cầu Tòa án có thẩm quyền giải quyết.'
    );

    drawSectionHeading(doc, 'ĐIỀU 7. ĐIỀU KHOẢN CHUNG');
    drawNumberedItems(doc, [
      'Hợp đồng có hiệu lực kể từ thời điểm giao dịch chuyển nhượng hoàn tất.',
      'Mọi sửa đổi, bổ sung phải được hai bên xác nhận.',
      'Hợp đồng điện tử này được tạo từ bản ghi chuyển nhượng trong hệ thống VALO Parking và có giá trị như nhau đối với hai bên.',
    ]);

    drawSignatureBlock(doc, data);
  });

const buildPdf = (lines) =>
  createPdf((doc) => {
    lines.forEach((line) => {
      ensureSpace(doc, 24);
      doc
        .font('NotoSerif')
        .fontSize(10)
        .fillColor(INK)
        .text(String(line ?? ''), { lineGap: 2 });
    });
  });

async function generateContractPDF(contract) {
  if (contract.status === 'DRAFT') {
    throw Object.assign(new Error('Không thể xuất PDF cho hợp đồng nháp'), {
      statusCode: 400,
    });
  }

  const watermark = contract.status === 'CANCELLED'
    ? 'ĐÃ HỦY'
    : contract.status === 'EXPIRED'
      ? 'HẾT HẠN'
      : '';
  const user = contract.userId || {};
  const vehicle = contract.vehicleId || {};
  const booking = contract.bookingId || {};
  const lines = [
    'VALO PARKING - HỢP ĐỒNG DỊCH VỤ ĐỖ XE',
    watermark ? `TRẠNG THÁI: ${watermark}` : '',
    `Mã hợp đồng: ${contract.contractCode}`,
    `Ngày tạo: ${formatDate(contract.createdAt)}`,
    `Loại hợp đồng: ${contract.type}`,
    `Khách hàng: ${user.username || ''}`,
    `Email: ${user.email || ''}`,
    `Biển số xe: ${vehicle.licensePlate || booking.licensePlate || ''}`,
    `Loại xe: ${vehicle.vehicleType || ''}`,
    `Vị trí đỗ: ${contract.slotCode}`,
    `Thời hạn: ${formatDate(contract.startTime)} - ${formatDate(contract.endTime)}`,
    `Tổng tiền: ${formatCurrency(contract.totalAmount)}`,
    `Thanh toán: ${contract.paymentStatus}`,
    'Điều khoản:',
    ...(String(contract.terms || '').match(/.{1,90}/g) || ['']),
    '',
    'Đại diện VALO Parking                         Khách hàng',
  ].filter((line) => line !== '');

  return buildPdf(lines);
}

module.exports = {
  buildPdf,
  buildTransferAgreementPdf,
  generateContractPDF,
  formatCurrency,
  formatDate,
};

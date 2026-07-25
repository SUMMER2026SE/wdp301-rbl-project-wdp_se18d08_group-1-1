const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildTransferContractLines,
} = require('../services/membershipEntitlementTransferService');
const {
  buildPdf,
  buildTransferAgreementPdf,
} = require('../services/pdfService');
const fontkit = require('fontkit');

test('transfer contract uses available snapshot fields and omits unsupported identity fields', () => {
  const lines = buildTransferContractLines({
    contractNumber: 'MTR-001',
    completedAt: new Date('2026-07-24T00:00:00.000Z'),
    askingPrice: 500000,
    transferFee: 25000,
    contractSnapshot: {
      contractNumber: 'MTR-001',
      completedAt: new Date('2026-07-24T00:00:00.000Z'),
      slotCode: 'A-01',
      askingPrice: 500000,
      transferFee: 25000,
      totalDue: 525000,
      paymentMethod: 'VALO Wallet',
      validFrom: new Date('2026-07-01T00:00:00.000Z'),
      expireAt: new Date('2027-07-01T00:00:00.000Z'),
      fromUser: { username: 'nguyen-a', email: 'a@example.com' },
      toUser: { username: 'nguyen-b', email: 'b@example.com' },
      floor: { name: 'Tang 1', floorNumber: 1 },
      parkingLot: { name: 'VALO Central', address: 'Quan 1, TP.HCM' },
      package: { name: 'Goi nam', type: 'yearly' },
    },
  });
  const content = lines.join('\n');

  assert.match(content, /MTR-001/);
  assert.match(content, /nguyen-a/);
  assert.match(content, /nguyen-b/);
  assert.match(content, /VALO Central/);
  assert.match(content, /A-01/);
  assert.match(content, /525[.,]000 VND/);
  assert.doesNotMatch(content, /CMND|CCCD|Mã số thuế|Điện thoại|Diện tích/);
});

test('PDF builder creates a valid multi-page document', async () => {
  const pdf = await buildPdf(
    Array.from({ length: 120 }, (_, index) => `Dòng nội dung ${index + 1}`)
  );

  assert.ok(pdf.length > 5000);
  assert.ok(pdf.subarray(0, 5).equals(Buffer.from('%PDF-')));
});

test('styled transfer agreement renders as a valid Vietnamese PDF', async () => {
  const pdf = await buildTransferAgreementPdf({
    contractNumber: 'MTR-001',
    completedAt: new Date('2026-07-24T00:00:00.000Z'),
    packageName: 'Premium Monthly',
    fromUser: { username: 'Nguyễn Văn A', email: 'a@example.com' },
    toUser: { username: 'Trần Văn B', email: 'b@example.com' },
    parkingLot: { name: 'Bãi xe trung tâm', address: 'Quận 1, TP.HCM' },
    floorName: 'Tầng 1',
    slotCode: 'A-01',
    validFrom: new Date('2026-07-01T00:00:00.000Z'),
    expireAt: new Date('2027-07-01T00:00:00.000Z'),
    askingPrice: 500000,
    transferFee: 25000,
    totalDue: 525000,
    paymentMethod: 'VALO Wallet',
  });

  assert.ok(pdf.length > 10000);
  assert.ok(pdf.subarray(0, 5).equals(Buffer.from('%PDF-')));
  assert.ok((pdf.toString('binary').match(/\/Type \/Page\b/g) || []).length <= 3);
});

test('embedded TrueType font covers every Vietnamese contract character', () => {
  const font = fontkit.openSync(
    require.resolve('dejavu-fonts-ttf/ttf/DejaVuSerif.ttf')
  );
  const contractText =
    'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM – Độc lập – Tự do – Hạnh phúc ' +
    'HỢP ĐỒNG CHUYỂN NHƯỢNG QUYỀN SỬ DỤNG CHỖ ĐỖ XE';
  const missingCharacters = [
    ...new Set(
      [...contractText].filter(
        (character) => !font.hasGlyphForCodePoint(character.codePointAt(0))
      )
    ),
  ];

  assert.deepEqual(missingCharacters, []);
});

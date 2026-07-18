export interface RefundResult {
  actualHours: number;
  refundHours: number;
  refundAmount: number;
  finalParkingCost: number;
}

export const calculateCheckOutRefund = (
  checkInTime: Date,
  checkOutTime: Date,
  paidHours: number,
  hourlyRate: number,
  packageType?: string,
): RefundResult => {
  if (packageType === 'daily') {
    return {
      actualHours: Math.max(
        1,
        Math.ceil((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)),
      ),
      refundHours: 0,
      refundAmount: 0,
      finalParkingCost: paidHours * hourlyRate,
    };
  }

  const durationMs = checkOutTime.getTime() - checkInTime.getTime();
  const actualHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
  const refundHours = Math.max(0, paidHours - actualHours);
  const refundAmount = refundHours * hourlyRate;
  const finalParkingCost = actualHours * hourlyRate;

  return {
    actualHours,
    refundHours,
    refundAmount,
    finalParkingCost,
  };
};

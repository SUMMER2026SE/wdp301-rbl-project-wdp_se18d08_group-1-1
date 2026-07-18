import type { Service } from '@/types/booking.types';

export const calculateParkingCost = (
  startTime: Date,
  endTime: Date,
  hourlyRate: number,
  isVIPReservedSlot = false,
) => {
  if (isVIPReservedSlot) {
    return 0;
  }

  const durationMs = endTime.getTime() - startTime.getTime();
  const paidHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));

  return paidHours * hourlyRate;
};

export const calculateServiceCost = (services: Service[], isYearlyVIPWithFreeService = false) => {
  const total = services.reduce((sum, service) => sum + Number(service.price || 0), 0);

  if (isYearlyVIPWithFreeService && services.length > 0) {
    return 0;
  }

  return total;
};

export const calculateTotalBookingCost = (params: { parkingCost: number; serviceCost: number }) =>
  params.parkingCost + params.serviceCost;

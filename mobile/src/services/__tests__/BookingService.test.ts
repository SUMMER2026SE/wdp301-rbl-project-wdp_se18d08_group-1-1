import bookingService from '../BookingService';
import { apiClient } from '../api/client';

describe('BookingService normalization', () => {
  const backendBooking = {
    _id: 'booking-1',
    userId: 'user-1',
    floorId: 'floor-1',
    parkingSlot: 'A01',
    licensePlate: '30A-12345',
    scheduledStart: '2026-07-14T01:00:00.000Z',
    scheduledEnd: '2026-07-14T03:00:00.000Z',
    durationHours: 2,
    prepaidAmount: 20_000,
    paymentMethod: 'wallet',
    status: 'PAID',
    createdAt: '2026-07-13T01:00:00.000Z',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps backend fields and status to the mobile booking model', () => {
    const booking = bookingService.normalizeBooking(backendBooking);

    expect(booking).toMatchObject({
      _id: 'booking-1',
      slotCode: 'A01',
      startTime: '2026-07-14T01:00:00.000Z',
      endTime: '2026-07-14T03:00:00.000Z',
      paidHours: 2,
      hourlyRate: 10_000,
      finalAmount: 20_000,
      status: 'confirmed',
      paymentStatus: 'paid',
    });
  });

  it.each([
    ['PENDING', 'pending', 'pending'],
    ['ACTIVE', 'active', 'paid'],
    ['PAUSED', 'paused', 'paid'],
    ['COMPLETED', 'completed', 'paid'],
    ['CANCELLED', 'cancelled', 'refunded'],
    ['EXPIRED', 'expired', 'failed'],
  ])('maps %s status safely', (backendStatus, mobileStatus, paymentStatus) => {
    const booking = bookingService.normalizeBooking({ ...backendBooking, status: backendStatus });

    expect(booking?.status).toBe(mobileStatus);
    expect(booking?.paymentStatus).toBe(paymentStatus);
  });

  it('normalizes direct and nested booking arrays and skips invalid records', () => {
    expect(bookingService.normalizeBookings({ data: [backendBooking] })).toHaveLength(1);
    expect(bookingService.normalizeBookings({ data: { data: [backendBooking, {}] } })).toHaveLength(1);
  });

  it('reads create responses shaped as data.booking with sibling services', () => {
    const booking = bookingService.normalizeBookingResponse({
      success: true,
      data: {
        booking: { ...backendBooking, prepaidAmount: 70_000 } as never,
        services: [{ serviceId: 'service-1', name: 'Car wash', price: 50_000 }],
      },
    });

    expect(booking?.services).toEqual([
      { _id: undefined, serviceId: 'service-1', name: 'Car wash', price: 50_000 },
    ]);
    expect(booking?.serviceAmount).toBe(50_000);
    expect(booking?.finalAmount).toBe(70_000);
    expect(booking?.hourlyRate).toBe(10_000);
  });

  it('calls the cancel endpoint for the selected booking', async () => {
    const post = jest.spyOn(apiClient, 'post').mockResolvedValue({ success: true, data: backendBooking });

    await bookingService.cancelBooking('booking-1');

    expect(post).toHaveBeenCalledWith('/bookings/booking-1/cancel');
  });

  it('reads the membership booking policy from availability responses', () => {
    const bookingPolicy = {
      activeMembership: true,
      membershipType: 'monthly' as const,
      assignedSlotOccupied: false,
      requiresAssignedSlotUse: true,
      reservedSlots: [{ floorId: 'floor-2', slotCode: 'C1' }],
    };

    expect(bookingService.normalizeBookingPolicy({
      success: true,
      data: { slots: [], bookingPolicy },
    })).toEqual(bookingPolicy);
  });

  it('calls the time endpoint with the new booking range', async () => {
    const put = jest.spyOn(apiClient, 'put').mockResolvedValue({ success: true, data: backendBooking });
    const payload = {
      newStart: backendBooking.scheduledStart,
      newEnd: '2026-07-14T04:00:00.000Z',
    };

    await bookingService.extendBooking('booking-1', payload);

    expect(put).toHaveBeenCalledWith('/bookings/booking-1/time', payload);
  });

  it('uses the same quote, hold, and bulk booking endpoints as the web flow', async () => {
    const post = jest.spyOn(apiClient, 'post').mockResolvedValue({ success: true, data: {} });
    const item = {
      vehicleId: 'vehicle-1',
      floorId: 'floor-1',
      slotCode: 'A01',
      startTime: backendBooking.scheduledStart,
      endTime: backendBooking.scheduledEnd,
      serviceIds: ['service-1'],
    };

    await bookingService.quoteBulkBooking([item]);
    await bookingService.createBookingHold({
      floorId: item.floorId,
      slotCode: item.slotCode,
      licensePlate: backendBooking.licensePlate,
      startTime: item.startTime,
      endTime: item.endTime,
    });
    await bookingService.createBulkBooking({
      idempotencyKey: 'mobile-key',
      items: [{ ...item, holdId: 'hold-1' }],
    });

    expect(post).toHaveBeenNthCalledWith(1, '/bookings/bulk/quote', { items: [item] });
    expect(post).toHaveBeenNthCalledWith(2, '/bookings/hold', {
      floorId: item.floorId,
      slotCode: item.slotCode,
      licensePlate: backendBooking.licensePlate,
      startTime: item.startTime,
      endTime: item.endTime,
    });
    expect(post).toHaveBeenNthCalledWith(3, '/bookings/bulk', {
      idempotencyKey: 'mobile-key',
      items: [{ ...item, holdId: 'hold-1' }],
    });
  });

  it('calls the booking vehicle endpoint with a registered vehicle', async () => {
    const put = jest.spyOn(apiClient, 'put').mockResolvedValue({ success: true, data: backendBooking });

    await bookingService.updateBookingVehicle('booking-1', 'vehicle-2');

    expect(put).toHaveBeenCalledWith('/bookings/booking-1/vehicle', { vehicleId: 'vehicle-2' });
  });
});

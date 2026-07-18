import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { useSocket } from '@/hooks/useSocket';
import bookingService from '@/services/BookingService';
import parkingFloorService from '@/services/ParkingFloorService';
import serviceService from '@/services/ServiceService';
import { walletService } from '@/services/api/wallet';
import type { CreateBookingRequest } from '@/types/api.types';
import type {
  AvailableSlot,
  Booking,
  BookingStatus,
  ParkingFloor,
  Service,
  SlotStatus,
} from '@/types/booking.types';
import type { BookingChangedEvent, SlotStatusChangedEvent } from '@/types/socket.types';

type BookingFilter = BookingStatus | 'all';

interface BookingContextValue {
  bookings: Booking[];
  availableSlots: AvailableSlot[];
  parkingFloors: ParkingFloor[];
  services: Service[];
  filterStatus: BookingFilter;
  isLoading: boolean;
  error: string;
  walletBalance: number;
  fetchBookings: () => Promise<void>;
  getAvailableSlots: (startTime: Date, endTime: Date) => Promise<void>;
  createBooking: (data: CreateBookingRequest) => Promise<Booking>;
  checkInBooking: (bookingId: string) => Promise<void>;
  checkOutBooking: (bookingId: string) => Promise<void>;
  getBookingById: (bookingId: string) => Booking | undefined;
  fetchParkingFloors: () => Promise<void>;
  fetchServices: () => Promise<void>;
  fetchWalletBalance: () => Promise<void>;
  setFilterStatus: (status: BookingFilter) => void;
  updateSlotStatus: (floorId: string, slotCode: string, status: SlotStatus) => void;
}

export const BookingContext = createContext<BookingContextValue | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const socket = useSocket();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [parkingFloors, setParkingFloors] = useState<ParkingFloor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [filterStatus, setFilterStatus] = useState<BookingFilter>('all');
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await bookingService.getMyBookings();
      setBookings(bookingService.normalizeBookings(response));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load bookings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAvailableSlots = useCallback(async (startTime: Date, endTime: Date) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await bookingService.getAvailableSlots(startTime, endTime);
      setAvailableSlots(response.data || []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load slots.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchParkingFloors = useCallback(async () => {
    setError('');
    try {
      setParkingFloors(await parkingFloorService.getParkingFloors());
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load parking floors.');
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      setServices(await serviceService.getActiveServices());
    } catch (fetchError) {
      if (__DEV__) {
        console.warn('[Booking] services failed:', fetchError);
      }
      setServices([]);
    }
  }, []);

  const fetchWalletBalance = useCallback(async () => {
    const response = await walletService.getWallet();
    setWalletBalance(Number(response.data?.balance || 0));
  }, []);

  const createBooking = useCallback(
    async (data: CreateBookingRequest) => {
      setIsLoading(true);
      setError('');
      try {
        const response = await bookingService.createBooking(data);
        const booking = response.data;

        if (!booking) {
          throw new Error('Booking response was empty.');
        }

        setBookings((current) => [booking, ...current]);
        await fetchWalletBalance();

        return booking;
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : 'Unable to create booking.');
        throw createError;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchWalletBalance],
  );

  const checkInBooking = useCallback(async (bookingId: string) => {
    setIsLoading(true);
    try {
      const response = await bookingService.checkInBooking(bookingId);
      const updated = response.data?.booking;
      if (updated) {
        setBookings((current) => current.map((item) => (item._id === bookingId ? updated : item)));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkOutBooking = useCallback(
    async (bookingId: string) => {
      setIsLoading(true);
      try {
        const response = await bookingService.checkOutBooking(bookingId);
        const updated = response.data?.booking;
        if (updated) {
          setBookings((current) => current.map((item) => (item._id === bookingId ? updated : item)));
        }
        await fetchWalletBalance();
      } finally {
        setIsLoading(false);
      }
    },
    [fetchWalletBalance],
  );

  const getBookingById = useCallback(
    (bookingId: string) => bookings.find((booking) => booking._id === bookingId),
    [bookings],
  );

  const updateSlotStatus = useCallback((floorId: string, slotCode: string, status: SlotStatus) => {
    setAvailableSlots((current) =>
      current.map((slot) =>
        slot.floorId === floorId && slot.slotCode === slotCode ? { ...slot, status } : slot,
      ),
    );
  }, []);

  useEffect(() => {
    const bookingHandler = (payload: unknown) => {
      const event = payload as BookingChangedEvent;
      setBookings((current) =>
        current.map((booking) =>
          booking._id === event.bookingId
            ? ({ ...booking, ...(event.booking || {}), status: event.status } as Booking)
            : booking,
        ),
      );
    };
    const slotHandler = (payload: unknown) => {
      const event = payload as SlotStatusChangedEvent;
      updateSlotStatus(event.floorId, event.slotCode, event.status);
    };

    socket.on('booking:changed', bookingHandler);
    socket.on('slot:status_changed', slotHandler);

    return () => {
      socket.off('booking:changed', bookingHandler);
      socket.off('slot:status_changed', slotHandler);
    };
  }, [socket, updateSlotStatus]);

  const value = useMemo<BookingContextValue>(
    () => ({
      bookings,
      availableSlots,
      parkingFloors,
      services,
      filterStatus,
      isLoading,
      error,
      walletBalance,
      fetchBookings,
      getAvailableSlots,
      createBooking,
      checkInBooking,
      checkOutBooking,
      getBookingById,
      fetchParkingFloors,
      fetchServices,
      fetchWalletBalance,
      setFilterStatus,
      updateSlotStatus,
    }),
    [
      bookings,
      availableSlots,
      parkingFloors,
      services,
      filterStatus,
      isLoading,
      error,
      walletBalance,
      fetchBookings,
      getAvailableSlots,
      createBooking,
      checkInBooking,
      checkOutBooking,
      getBookingById,
      fetchParkingFloors,
      fetchServices,
      fetchWalletBalance,
      updateSlotStatus,
    ],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};

import type { APIResponse } from '@/types/api';

import { apiClient } from './client';

export interface StaffCustomerProfile {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
}

export interface StaffCustomer {
  _id: string;
  username?: string;
  email: string;
  status?: 'active' | 'blocked' | 'inactive' | string;
  createdAt?: string;
  profile?: StaffCustomerProfile;
}

export interface StaffBooking {
  _id: string;
  licensePlate: string;
  parkingSlot: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  prepaidAmount?: number;
  paymentMethod?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: { _id?: string; fullName?: string; email?: string; phone?: string };
  vehicleId?: { licensePlate?: string; brand?: string; color?: string };
  floorId?: { _id?: string; name?: string; floorNumber?: number } | string;
}

export interface StaffSubscription {
  _id: string;
  amount: number;
  paymentStatus: string;
  status: string;
  validFrom: string;
  expireAt: string;
  user?: { _id?: string; username?: string; email?: string; status?: string; vehicles?: string[] };
  ticketPackage?: { _id?: string; name?: string; type?: string; price?: number };
  slots?: Array<{ floorId?: { _id?: string; name?: string; floorNumber?: number } | string; slotCode: string }>;
}

export interface TicketPackage {
  _id: string;
  name: string;
  type: 'hourly' | 'daily' | 'monthly' | 'yearly';
  price: number;
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface TicketPackageInput {
  name: string;
  type: TicketPackage['type'];
  price: number;
  description?: string;
  isActive: boolean;
}

export interface StaffSession {
  _id: string;
  licensePlate: string;
  parkingSlot?: string;
  floorId?: string;
  checkInTime: string;
  checkOutTime?: string;
  status: string;
}

export const staffService = {
  getCustomers: () => apiClient.get<APIResponse<StaffCustomer[]>>('/staff/users'),
  updateCustomerStatus: (id: string, status: string) =>
    apiClient.put<APIResponse<StaffCustomer>>(`/staff/users/${id}/status`, { status }),
  updateCustomer: (id: string, data: StaffCustomerProfile) =>
    apiClient.put<APIResponse<StaffCustomer>>(`/staff/users/${id}`, data),
  getBookings: (params?: { date?: string; floorId?: string }) =>
    apiClient.get<APIResponse<StaffBooking[]>>('/bookings/all', { params }),
  getSubscriptions: () => apiClient.get<APIResponse<StaffSubscription[]>>('/subscriptions/all'),
  getTicketPackages: () => apiClient.get<APIResponse<TicketPackage[]>>('/ticket-packages'),
  createTicketPackage: (data: TicketPackageInput) =>
    apiClient.post<APIResponse<TicketPackage>>('/ticket-packages', data),
  updateTicketPackage: (id: string, data: TicketPackageInput) =>
    apiClient.put<APIResponse<TicketPackage>>(`/ticket-packages/${id}`, data),
  deleteTicketPackage: (id: string) => apiClient.delete<APIResponse>(`/ticket-packages/${id}`),
  getSessions: () => apiClient.get<APIResponse<StaffSession[]>>('/sessions'),
};

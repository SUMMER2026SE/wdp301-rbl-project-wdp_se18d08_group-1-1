export type SubscriptionPackageType = 'monthly' | 'yearly';
export type SubscriptionPaymentMethod = 'payos' | 'wallet';

export interface SubscriptionPackage {
  _id: string;
  id?: string;
  name: string;
  type: SubscriptionPackageType;
  price: number;
  description?: string;
  isActive: boolean;
  durationMonths?: number;
  benefits?: string[];
}

export interface ReservedSlot {
  floorId: string;
  floorName: string;
  floorNumber?: number | null;
  slotCode: string;
}

export interface MembershipStatus {
  isVip: boolean;
  status: 'active' | 'expired';
  expireAt: string | null;
  expirationWarning: boolean;
  freeServiceCount: number;
  package: {
    id: string;
    name: string;
    type: SubscriptionPackageType;
    price: number;
    description?: string;
  } | null;
  reservedSlots: ReservedSlot[];
  benefits: string[];
  renewal: {
    status: 'manual';
    nextRenewalDate: string | null;
    price: number;
    message: string;
  };
}

export interface SubscriptionSlotSelection {
  floorId: string;
  slotCode: string;
}

export interface CreateSubscriptionPaymentRequest {
  packageId: string;
  slots: SubscriptionSlotSelection[];
}

export interface CreateSubscriptionPaymentResponse {
  success: boolean;
  data: {
    subscriptionId: string;
    orderCode: number;
    amount: number;
    checkoutUrl: string;
    qrCode?: string;
  };
}

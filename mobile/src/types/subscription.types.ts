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
  entitlementId?: string | null;
  sourceSubscriptionId?: string;
  floorId: string;
  floorName: string;
  floorNumber?: number | null;
  slotCode: string;
  status?: string;
  validFrom?: string;
  expireAt?: string;
  unitAmount?: number;
  transferCount?: number;
  canTransfer?: boolean;
}

export interface MembershipStatus {
  isVip: boolean;
  status: 'active' | 'expired';
  subscriptionId?: string | null;
  expireAt: string | null;
  daysUntilExpiration?: number | null;
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
    canRenew?: boolean;
    renewalWindowDays?: number;
  };
}

export interface SubscriptionRenewalQuote {
  quoteId: string;
  quoteExpiresAt: string;
  subscriptionId: string;
  entitlementId?: string;
  currentExpireAt: string;
  newExpireAt: string;
  daysUntilExpiration: number;
  renewalWindowDays: number;
  eligibleVehicleCount: number;
  retainedSlots: SubscriptionSlotSelection[];
  unitPrice: number;
  amount: number;
  package: {
    id: string;
    name: string;
    type: SubscriptionPackageType;
    unitPrice: number;
  };
}

export interface SubscriptionRenewalResult {
  renewalId: string;
  subscriptionId: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  paymentMethod: SubscriptionPaymentMethod;
  amount: number;
  oldExpireAt: string;
  newExpireAt: string;
  orderCode?: number | null;
  checkoutUrl?: string;
  paymentLinkId?: string;
  qrCode?: string;
  walletBalance?: number;
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

export interface MembershipEntitlementTransfer {
  _id: string;
  status:
    | 'PENDING_RECIPIENT'
    | 'PENDING_ADMIN'
    | 'AWAITING_PAYMENT'
    | 'COMPLETED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'EXPIRED';
  askingPrice: number;
  transferFee: number;
  fromUserId: { _id: string; username?: string; email?: string } | string;
  toUserId: { _id: string; username?: string; email?: string } | string;
  entitlementId:
    | (ReservedSlot & { _id: string })
    | string;
}

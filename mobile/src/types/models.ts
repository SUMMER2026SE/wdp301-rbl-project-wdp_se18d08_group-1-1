export type UserRole = 'guest' | 'customer' | 'staff' | 'admin';

export interface UserMembership {
  isVip: boolean;
  expireAt: string | null;
  packageId: string | null;
  freeServiceCount: number;
}

export interface User {
  id: string;
  _id?: string;
  username: string;
  email: string;
  role: UserRole;
  status: boolean;
  isEmailVerified: boolean;
  googleId?: string;
  avatar?: string;
  membership?: UserMembership;
  createdAt?: string;
}

export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  dob: string | null;
  gender: 'male' | 'female' | 'other' | '';
  avatar: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MeResponse {
  success: boolean;
  data: {
    user: User;
    profile: UserProfile | null;
  };
}

export type VehicleType = 'car' | 'electric_car';

export interface Vehicle {
  id: string;
  _id?: string;
  userId?: string;
  owner?: string;
  licensePlate: string;
  vehicleType: VehicleType;
  brand: string;
  model: string;
  color: string;
  nickname?: string;
  hexColor?: string;
  registrationCardImage?: string;
  isDefault: boolean;
  status?: string;
  modelUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVehicleRequest {
  licensePlate: string;
  vehicleType: VehicleType;
  brand: string;
  model: string;
  color: string;
  nickname?: string;
  hexColor?: string;
  registrationCardImage?: string;
}

export interface UpdateVehicleRequest {
  brand?: string;
  model?: string;
  color?: string;
  nickname?: string;
  hexColor?: string;
}

export type NotificationType =
  | 'SYSTEM'
  | 'PARKING'
  | 'BOOKING'
  | 'WALLET'
  | 'PAYMENT'
  | 'ACCOUNT'
  | 'PROMOTION'
  | 'CAMERA'
  | 'VIOLATION';

export type NotificationPriority = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SYSTEM';

export interface UserNotification {
  id?: string;
  _id?: string;
  notificationId?: string;
  title: string;
  content: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type PolicyCategory = 'terms' | 'privacy' | 'refund' | 'parking_rules' | 'safety' | 'other';

export interface PolicyVersion {
  _id?: string;
  policyId?: string;
  versionNumber: string | number;
  title?: string;
  summary?: string;
  content?: string;
  effectiveDate?: string;
  changeNote?: string;
  publishedAt?: string;
}

export interface Policy {
  id?: string;
  _id?: string;
  slug: string;
  title: string;
  description?: string;
  category: PolicyCategory;
  currentVersion?: PolicyVersion | null;
  currentVersionNumber?: string | number;
  versionNumber?: string | number;
  requiresAcceptance?: boolean;
  acceptedAt?: string | null;
  isAccepted?: boolean;
  publishedAt?: string;
  createdAt?: string;
}

export interface PolicyDetail extends Policy {
  content: string;
  versionHistory?: Array<{
    versionNumber: string | number;
    publishedAt?: string;
    changeSummary?: string;
  }>;
}

export interface MissingPolicyAcceptance {
  policyId: string;
  policyVersionId?: string;
  slug: string;
  title: string;
  versionNumber: string | number;
}

export interface PolicyAcceptanceStatus {
  hasMissingRequiredPolicies: boolean;
  missingPolicies: MissingPolicyAcceptance[];
}

export type TransactionType =
  | 'deposit'
  | 'withdraw'
  | 'payment'
  | 'refund'
  | 'booking_payment'
  | 'subscription_payment'
  | 'topup'
  | 'TOP_UP'
  | 'PAYMENT'
  | 'REFUND';

export type TransactionStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface Wallet {
  id?: string;
  _id?: string;
  userId: string;
  balance: number;
  currency?: string;
  totalTopUp?: number;
  totalRefunded?: number;
  monthlyTopUp?: number;
  monthlySpent?: number;
  monthlyRefunded?: number;
  status?: 'active' | 'frozen';
  overdraftLimit?: number;
  totalDeposited?: number;
  totalSpent?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletTransaction {
  id: string;
  _id?: string;
  walletId?: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  referenceId?: string;
  orderCode?: number;
  payosOrderCode?: number;
  payosReference?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  refSource?: string;
  refSourceId?: string;
  createdAt: string;
}

export interface CreateTopUpRequest {
  amount: number;
  paymentMethod?: 'payos' | 'credit_card';
  returnUrl?: string;
  cancelUrl?: string;
}

export interface TopUpResponse {
  success: boolean;
  data: {
    transactionId?: string;
    checkoutUrl: string;
    orderCode: string | number;
    amount?: number;
    qrCode?: string;
    paymentLinkId?: string;
  };
}

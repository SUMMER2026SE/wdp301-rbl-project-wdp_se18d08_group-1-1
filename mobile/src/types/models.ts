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

export type VehicleType = 'motorbike' | 'car';

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
}

export interface UpdateVehicleRequest {
  brand?: string;
  model?: string;
  color?: string;
}

export type TransactionType =
  | 'deposit'
  | 'withdraw'
  | 'payment'
  | 'refund'
  | 'booking_payment'
  | 'subscription_payment'
  | 'topup';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface Wallet {
  id?: string;
  _id?: string;
  userId: string;
  balance: number;
  currency?: string;
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
    checkoutUrl: string;
    orderCode: string | number;
  };
}

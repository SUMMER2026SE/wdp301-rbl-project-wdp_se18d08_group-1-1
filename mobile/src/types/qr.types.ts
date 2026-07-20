export interface SignedQrResponse {
  available: boolean;
  credentialType?: 'ACCOUNT' | 'LEGACY_SUBSCRIPTION';
  payload: string | null;
  reason?: string | null;
  bookingStatus?: string;
  membershipStatus?: string;
  expireAt?: string | null;
}

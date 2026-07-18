import { CustomerAppError, CustomerErrorType } from '@/types/error.types';

export const getErrorMessage = (error: CustomerAppError) => {
  switch (error.type) {
    case CustomerErrorType.NETWORK_ERROR:
      return 'Unable to connect. Please check your internet connection.';
    case CustomerErrorType.AUTHENTICATION_ERROR:
      return 'Your session has expired. Please log in again.';
    case CustomerErrorType.INSUFFICIENT_BALANCE:
      return 'Insufficient wallet balance. Please top up your wallet.';
    case CustomerErrorType.CONFLICT_ERROR:
      return error.message || 'This booking conflicts with another parking activity.';
    case CustomerErrorType.PERMISSION_DENIED:
      return 'Camera permission is required to scan QR codes.';
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
};

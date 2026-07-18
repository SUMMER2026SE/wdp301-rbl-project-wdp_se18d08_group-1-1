import { CustomerAppError, CustomerErrorType } from '@/types/error.types';

export const handleAPIError = (error: unknown): CustomerAppError => {
  const maybeError = error as {
    response?: { status?: number; data?: { message?: string; data?: unknown } };
    status?: number;
    message?: string;
    data?: unknown;
  };

  const status = maybeError.response?.status ?? maybeError.status;
  const data = maybeError.response?.data;
  const message = data?.message || maybeError.message || 'An unexpected error occurred.';

  if (!status) {
    return {
      type: CustomerErrorType.NETWORK_ERROR,
      message: 'Network error. Please check your connection and try again.',
    };
  }

  if (status === 401) {
    return {
      type: CustomerErrorType.AUTHENTICATION_ERROR,
      message: 'Session expired. Please log in again.',
      statusCode: 401,
    };
  }

  if (status === 400) {
    return {
      type: CustomerErrorType.VALIDATION_ERROR,
      message,
      statusCode: 400,
      details: data?.data,
    };
  }

  if (status === 409) {
    return {
      type: CustomerErrorType.CONFLICT_ERROR,
      message,
      statusCode: 409,
      details: data?.data,
    };
  }

  if (status >= 500) {
    return {
      type: CustomerErrorType.SERVER_ERROR,
      message: 'Server error. Please try again later.',
      statusCode: status,
    };
  }

  return {
    type: CustomerErrorType.UNKNOWN_ERROR,
    message,
    statusCode: status,
  };
};

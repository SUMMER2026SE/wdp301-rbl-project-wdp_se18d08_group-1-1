export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  type: ErrorType;
  message: string;
  field?: string;
  statusCode?: number;
  originalError?: unknown;
}

export class NetworkError extends Error implements AppError {
  type = ErrorType.NETWORK_ERROR;
  statusCode = 0;

  constructor(message = 'Network error. Please check your connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error implements AppError {
  type = ErrorType.AUTHENTICATION_ERROR;
  statusCode = 401;

  constructor(message = 'Authentication failed. Please login again.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error implements AppError {
  type = ErrorType.VALIDATION_ERROR;
  field?: string;
  statusCode = 400;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

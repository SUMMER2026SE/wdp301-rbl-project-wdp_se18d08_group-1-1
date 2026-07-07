export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyOTP: { email: string };
  ResetPassword: { email: string; otp: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  BookingsTab: undefined;
  WalletTab: undefined;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
};

export type BookingStackParamList = {
  BookingBrowse: undefined;
  BookingConfirmation: { bookingId: string };
  MyBookings: undefined;
  BookingDetails: { bookingId: string };
  QRScanner: { mode: 'check-in' | 'check-out'; bookingId?: string };
  ParkingMap: {
    floorId?: string;
    selectedTimeRange?: {
      startTime: string;
      endTime: string;
    };
  };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  VehicleList: undefined;
  AddVehicle: undefined;
  EditVehicle: { vehicleId: string };
};

export type WalletStackParamList = {
  Wallet: undefined;
  TopUp: undefined;
  TransactionHistory: undefined;
  TransactionDetail: { transactionId: string };
};

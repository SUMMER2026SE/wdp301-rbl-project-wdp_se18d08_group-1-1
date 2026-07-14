import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { ResetPasswordScreen } from '@/screens/auth/ResetPasswordScreen';
import { VerifyOTPScreen } from '@/screens/auth/VerifyOTPScreen';

import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen component={LoginScreen} name="Login" />
    <Stack.Screen component={RegisterScreen} name="Register" />
    <Stack.Screen component={ForgotPasswordScreen} name="ForgotPassword" />
    <Stack.Screen component={VerifyOTPScreen} name="VerifyOTP" />
    <Stack.Screen component={ResetPasswordScreen} name="ResetPassword" />
  </Stack.Navigator>
);

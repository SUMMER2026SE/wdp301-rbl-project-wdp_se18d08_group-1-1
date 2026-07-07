import Constants from 'expo-constants';

const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

const envName = process.env.EXPO_PUBLIC_ENV || 'development';

const defaults = {
  development: {
    apiBaseUrl: 'http://localhost:5000/api',
    socketUrl: 'http://localhost:5000',
  },
  staging: {
    apiBaseUrl: 'https://staging-api.valoparking.com/api',
    socketUrl: 'https://staging-api.valoparking.com',
  },
  production: {
    apiBaseUrl: 'https://api.valoparking.com/api',
    socketUrl: 'https://api.valoparking.com',
  },
} as const;

type EnvName = keyof typeof defaults;

const selectedEnv: EnvName =
  envName === 'staging' || envName === 'production' ? envName : 'development';

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  defaults[selectedEnv].apiBaseUrl;

const socketUrl =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  Constants.expoConfig?.extra?.socketUrl ||
  defaults[selectedEnv].socketUrl;

export const config = {
  envName: selectedEnv,
  apiBaseUrl: trimTrailingSlash(apiBaseUrl),
  socketUrl: trimTrailingSlash(socketUrl),
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
};

export const API_BASE_URL = config.apiBaseUrl;
export const SOCKET_URL = config.socketUrl;

export const validateConfig = () => {
  const missing: string[] = [];

  if (!API_BASE_URL) {
    missing.push('EXPO_PUBLIC_API_URL');
  }

  if (!SOCKET_URL) {
    missing.push('EXPO_PUBLIC_SOCKET_URL');
  }

  if (selectedEnv === 'production' && !API_BASE_URL.startsWith('https://')) {
    missing.push('EXPO_PUBLIC_API_URL must use HTTPS in production');
  }

  return missing;
};

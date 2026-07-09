import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { testBackendConnection } from '../api/auth.api';
import type { NormalizedApiError } from '../api/axiosClient';
import { API_URL } from '../constants/env';

type RequestState = 'idle' | 'loading' | 'success' | 'error';

export default function ApiTestScreen() {
  const [status, setStatus] = useState<RequestState>('idle');
  const [message, setMessage] = useState('Press the button to test backend connectivity.');

  const handleTestApi = async () => {
    setStatus('loading');
    setMessage('Calling backend...');

    try {
      const data = await testBackendConnection();
      setStatus('success');
      setMessage(data.message || data.status || 'Backend connection successful.');
    } catch (error) {
      const apiError = error as NormalizedApiError;
      setStatus('error');
      setMessage(apiError.message || 'Cannot connect to backend.');
    }
  };

  const isLoading = status === 'loading';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mobile API Test</Text>
          <Text style={styles.subtitle}>{API_URL}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={[styles.status, styles[status]]}>{status.toUpperCase()}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={handleTestApi}
            style={({ pressed }) => [
              styles.button,
              isLoading && styles.buttonDisabled,
              pressed && !isLoading && styles.buttonPressed,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Test API</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#4b5563',
    fontSize: 14,
    marginTop: 8,
  },
  panel: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
  },
  status: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  idle: {
    color: '#4b5563',
  },
  loading: {
    color: '#2563eb',
  },
  success: {
    color: '#047857',
  },
  error: {
    color: '#dc2626',
  },
  message: {
    color: '#1f2937',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonPressed: {
    backgroundColor: '#1d4ed8',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

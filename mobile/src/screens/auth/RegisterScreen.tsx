import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import type { AuthStackParamList } from '@/navigation/types';
import { authService } from '@/services/api/auth';
import { colors } from '@/theme';
import { isValidEmail, isValidPassword } from '@/utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (!username.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isValidPassword(password)) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await authService.register({
        username: normalizedName,
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        password,
        role: 'customer',
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Registration failed.');
    }
  };

  return (
    <Screen scrollable>
      <AppText variant="h1">Create account</AppText>
      <Input label="Name" onChangeText={setName} placeholder="Full name" value={name} />
      <Input
        autoCapitalize="none"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        value={email}
      />
      <View pointerEvents="none" style={styles.cornerGlow} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.logoGlow}>
              <Image resizeMode="contain" source={LogoImg} style={styles.logoImg} />
            </View>
            <Text style={styles.brandName}>VALO</Text>
            <Text style={styles.brandSub}>PARKING</Text>
          </View>

          <View style={styles.card}>
            <LinearGradient
              colors={[COLORS.gold, 'transparent']}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={styles.cardTopLine}
            />
            <Text style={styles.cardTitle}>Create account</Text>
            <Text style={styles.cardSub}>Book parking and manage your VALO wallet</Text>

            <Field
              icon={<Ionicons color={COLORS.textMuted} name="person-outline" size={18} />}
              placeholder="Full name"
              value={username}
              onChangeText={setUsername}
            />
            <Field
              autoCapitalize="none"
              icon={<Ionicons color={COLORS.textMuted} name="mail-outline" size={18} />}
              keyboardType="email-address"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
            />
            <Field
              icon={<Ionicons color={COLORS.textMuted} name="call-outline" size={18} />}
              keyboardType="phone-pad"
              placeholder="Phone number"
              value={phone}
              onChangeText={setPhone}
            />
            <Field
              autoCapitalize="none"
              icon={<Ionicons color={COLORS.textMuted} name="lock-closed-outline" size={18} />}
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons color={COLORS.error} name="warning-outline" size={16} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isLoading}
              style={[styles.submitBtn, isLoading && styles.disabled]}
              onPress={handleSubmit}
            >
              <LinearGradient
                colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
                end={{ x: 1, y: 0 }}
                start={{ x: 0, y: 0 }}
                style={styles.submitGrad}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.textInverse} size="small" />
                ) : (
                  <>
                    <Text style={styles.submitText}>Create account</Text>
                    <Ionicons color={COLORS.textInverse} name="arrow-forward" size={18} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Pressable
              style={({ pressed }) => [styles.loginRow, pressed && styles.pressed]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.loginText}>Already have an account? </Text>
              <Text style={[styles.loginText, styles.loginLink]}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;

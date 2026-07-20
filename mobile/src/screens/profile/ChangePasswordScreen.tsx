import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  type DimensionValue,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  PasswordField,
  PrimaryCTA,
  ProfileScreenHeader,
  SectionHeader,
  StaggeredView,
} from '@/components/profile/ProfileUI';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useToast } from '@/hooks/useToast';
import { profileService } from '@/services/api/profile';
import { calculatePasswordStrength } from '@/utils/profileValidation';

export const ChangePasswordScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      setError('The new password must be at least 6 characters.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('The new password must differ from your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('The password confirmation does not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await profileService.changePassword({ currentPassword, newPassword, confirmPassword });
      toast.showSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      navigation.goBack();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to change password.');
    } finally {
      setLoading(false);
    }
  };

  const strength = calculatePasswordStrength(newPassword);

  const strengthMeta = useMemo<{ color: string; label: string; width: DimensionValue }>(() => {
    switch (strength) {
      case 'strong':
        return { color: COLORS.success, label: 'Strong', width: '100%' };
      case 'medium':
        return { color: COLORS.warning, label: 'Medium', width: '66%' };
      case 'weak':
        return { color: COLORS.error, label: 'Weak', width: '33%' };
      default:
        return { color: COLORS.textMuted, label: 'Not entered', width: '0%' };
    }
  }, [strength]);

  const fieldErrors = {
    confirm: error === 'The password confirmation does not match.' ? error : undefined,
    current: error === 'The new password must differ from your current password.' ? error : undefined,
    next: error === 'The new password must be at least 6 characters.' ? error : undefined,
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.keyboard}
      >
        <ProfileScreenHeader title="Change password" subtitle="Secure your VALO account" onBack={() => navigation.goBack()} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StaggeredView delay={90} style={styles.formSection}>
            <SectionHeader title="Credentials" />
            <PasswordField
              error={fieldErrors.current}
              label="Current password"
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={(value) => {
                setCurrentPassword(value);
                if (error) setError('');
              }}
            />
            <PasswordField
              error={fieldErrors.next}
              label="New password"
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                if (error) setError('');
              }}
            />
            <PasswordField
              error={fieldErrors.confirm}
              label="Confirm password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (error) setError('');
              }}
            />
          </StaggeredView>

          <StaggeredView delay={220} style={styles.requirements}>
            <View style={styles.requirementHeader}>
              <Text style={styles.requirementTitle}>Password strength</Text>
              <Text style={[styles.strengthText, { color: strengthMeta.color }]}>{strengthMeta.label}</Text>
            </View>
            <View style={styles.strengthTrack}>
              <View style={[styles.strengthFill, { backgroundColor: strengthMeta.color, width: strengthMeta.width }]} />
            </View>
            <View style={styles.requirementRow}>
              <Ionicons
                name={newPassword.length >= 6 ? 'checkmark-circle-outline' : 'ellipse-outline'}
                size={16}
                color={newPassword.length >= 6 ? COLORS.success : COLORS.textMuted}
              />
              <Text style={styles.requirementText}>At least 6 characters</Text>
            </View>
          </StaggeredView>

          {error && !fieldErrors.current && !fieldErrors.next && !fieldErrors.confirm ? (
            <StaggeredView delay={260} style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={17} color={COLORS.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </StaggeredView>
          ) : null}

          <StaggeredView delay={320} style={styles.cta}>
            <PrimaryCTA
              disabled={loading}
              label="Change password"
              loading={loading ? <ActivityIndicator color={COLORS.textInverse} size="small" /> : undefined}
              onPress={handleSubmit}
            />
          </StaggeredView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    gap: SPACING.xl,
    paddingBottom: 118,
    paddingHorizontal: SPACING.lg,
  },
  formSection: {
    gap: SPACING.md,
    paddingTop: SPACING.sm,
  },
  requirements: {
    borderBottomColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  requirementHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  requirementTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  strengthText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  strengthTrack: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.round,
    height: 4,
    overflow: 'hidden',
  },
  strengthFill: {
    borderRadius: RADIUS.round,
    height: 4,
  },
  requirementRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  requirementText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,77,77,0.08)',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  errorBannerText: {
    color: COLORS.error,
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  cta: {
    marginTop: SPACING.xs,
  },
});

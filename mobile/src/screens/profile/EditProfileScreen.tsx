import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useProfileData } from '@/hooks/useProfileData';
import { useToast } from '@/hooks/useToast';
import type { ProfileStackParamList } from '@/navigation/types';
import { profileService } from '@/services/api/profile';
import { validateDateOfBirth, validateVietnamesePhone } from '@/utils/profileValidation';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>;

export const EditProfileScreen = ({ navigation }: Props) => {
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfileData();
  const imageUpload = useImageUpload();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName || '');
    setLastName(profile.lastName || '');
    setPhone(profile.phone || '');
    setDob(profile.dob ? profile.dob.slice(0, 10) : '');
    setGender(profile.gender || '');
    setAvatar(profile.avatar || undefined);
  }, [profile]);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    if (phone && !validateVietnamesePhone(phone)) next.phone = 'Số điện thoại không hợp lệ.';
    const dobResult = validateDateOfBirth(dob);
    if (!dobResult.valid && dobResult.error) next.dob = dobResult.error;
    if (gender && !['male', 'female', 'other'].includes(gender)) next.gender = 'Chọn male, female, hoặc other.';
    return next;
  }, [dob, gender, phone]);

  const hasChanges = Boolean(
    profile &&
      (firstName !== (profile.firstName || '') ||
        lastName !== (profile.lastName || '') ||
        phone !== (profile.phone || '') ||
        dob !== (profile.dob ? profile.dob.slice(0, 10) : '') ||
        gender !== (profile.gender || '')),
  );

  const uploadAvatar = async () => {
    const asset = await imageUpload.pickSquareImage();
    if (!asset) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const processed = await imageUpload.processAvatar(asset.uri);
      const response = await profileService.uploadAvatar({
        uri: processed.uri,
        name: asset.fileName || 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      setAvatar(response.data.avatarUrl);
      await refreshUser();
      toast.showSuccess('Cập nhật ảnh đại diện thành công');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Tải ảnh lên thất bại.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(errors).length > 0 || !hasChanges) return;
    setLoading(true);
    setError('');
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        dob: dob.trim() || undefined,
        gender: gender.trim() as 'male' | 'female' | 'other' | undefined,
      });
      toast.showSuccess('Cập nhật hồ sơ thành công');
      navigation.goBack();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Cập nhật thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const initial = (user?.username || 'C').charAt(0).toUpperCase();

  if (profileLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#080808" />
        <ScreenHeader title="Sửa hồ sơ" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader title="Sửa hồ sơ" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity activeOpacity={0.8} onPress={uploadAvatar} style={styles.avatarWrap}>
            <View style={[styles.avatarRing, { overflow: 'hidden' }]}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>
            <View style={styles.editBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator color={COLORS.background} size="small" />
              ) : (
                <Ionicons name="camera" size={14} color={COLORS.background} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Họ</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Nguyễn"
                  placeholderTextColor={COLORS.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Tên</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Văn A"
                  placeholderTextColor={COLORS.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại</Text>
            <View style={[styles.inputWrap, errors.phone && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="VD: 0912345678"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ngày sinh (YYYY-MM-DD)</Text>
            <View style={[styles.inputWrap, errors.dob && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="VD: 1990-01-01"
                placeholderTextColor={COLORS.textMuted}
                value={dob}
                onChangeText={setDob}
              />
            </View>
            {errors.dob ? <Text style={styles.errorText}>{errors.dob}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Giới tính</Text>
            <View style={[styles.inputWrap, errors.gender && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="male, female, hoặc other"
                placeholderTextColor={COLORS.textMuted}
                value={gender}
                onChangeText={setGender}
              />
            </View>
            {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
          </View>
        </View>

        {error ? <Text style={[styles.errorText, { textAlign: 'center' }]}>{error}</Text> : null}

        <TouchableOpacity 
          activeOpacity={0.8} 
          style={[styles.primaryButton, (!hasChanges || Object.keys(errors).length > 0 || loading) && styles.disabled]} 
          onPress={handleSubmit}
          disabled={!hasChanges || Object.keys(errors).length > 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textInverse} size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Lưu Thay Đổi</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.goldDark,
    borderWidth: 2.5,
    borderColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZES.hero,
    fontWeight: '800',
    color: COLORS.textInverse,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
  },
  primaryButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, Button, Card } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { profileService } from '@/services/api/profile';
import { colors, spacing } from '@/theme';

type ProfileNavigation = {
  navigate: (route: 'EditProfile' | 'ChangePassword' | 'VehicleList') => void;
};

export const ProfileScreen = ({ navigation }: { navigation: ProfileNavigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const toast = useToast();
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      toast.showWarning('Permission needed', 'Photo library access is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    setAvatarUri(asset.uri);
    setUploading(true);
    try {
      await profileService.uploadAvatar({
        uri: asset.uri,
        name: asset.fileName || 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      await refreshUser();
      toast.showSuccess('Avatar updated');
    } catch (error) {
      toast.showError('Upload failed', error instanceof Error ? error.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  const displayName = user?.username || user?.email || 'Customer';

  return (
    <Screen scrollable>
      <Card>
        <View style={styles.header}>
          <Avatar name={displayName} size={80} uri={avatarUri} />
          <View style={styles.identity}>
            <AppText variant="h2">{displayName}</AppText>
            <AppText color={colors.light.text.secondary}>{user?.email}</AppText>
          </View>
        </View>
        <Button loading={uploading} title="Upload Avatar" variant="outline" onPress={pickAvatar} />
      </Card>
      <Button title="Edit Profile" onPress={() => navigation.navigate('EditProfile')} />
      <Button
        title="Change Password"
        variant="outline"
        onPress={() => navigation.navigate('ChangePassword')}
      />
      <Button
        title="Vehicles"
        variant="outline"
        onPress={() => navigation.navigate('VehicleList')}
      />
      <Button title="Logout" variant="ghost" onPress={logout} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  identity: {
    flex: 1,
    gap: spacing.xs,
  },
});

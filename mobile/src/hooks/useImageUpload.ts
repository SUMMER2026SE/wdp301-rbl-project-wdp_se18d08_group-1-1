import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

export const useImageUpload = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickSquareImage = async () => {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is required.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    return result.canceled ? null : result.assets[0];
  };

  const processAvatar = async (uri: string) => {
    setLoading(true);
    try {
      return await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { height: 400, width: 400 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, pickSquareImage, processAvatar };
};


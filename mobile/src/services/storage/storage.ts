import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  getString: (key: string) => AsyncStorage.getItem(key),
  setString: (key: string, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: string) => AsyncStorage.removeItem(key),
};

import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'valo.accessToken';
const REFRESH_TOKEN_KEY = 'valo.refreshToken';

class TokenStorage {
  async saveAccessToken(token: string) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  }

  async getAccessToken() {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  }

  async saveRefreshToken(token: string) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  }

  async getRefreshToken() {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  }

  async saveTokens(tokens: { accessToken: string; refreshToken: string }) {
    await Promise.all([
      this.saveAccessToken(tokens.accessToken),
      this.saveRefreshToken(tokens.refreshToken),
    ]);
  }

  async clearTokens() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  }

  async hasValidTokens() {
    const [accessToken, refreshToken] = await Promise.all([
      this.getAccessToken(),
      this.getRefreshToken(),
    ]);

    return Boolean(accessToken && refreshToken);
  }
}

export const tokenStorage = new TokenStorage();

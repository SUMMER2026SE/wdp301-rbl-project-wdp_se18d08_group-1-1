const AUTH_CHANGE_EVENT = "valo_auth_change";

export const clearAuthSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("valo_user");
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};

export const notifyAuthChange = () => {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};

export const getStoredRefreshToken = () => localStorage.getItem("refreshToken");

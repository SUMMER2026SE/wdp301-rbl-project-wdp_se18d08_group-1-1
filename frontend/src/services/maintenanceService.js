import { apiFetch } from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const startMaintenance = async (payload) => {
  return await apiFetch(`/maintenance/start`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
};

export const endMaintenance = async (payload) => {
  return await apiFetch(`/maintenance/end`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
};

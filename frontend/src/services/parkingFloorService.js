import { apiFetch } from "./api";

// Helper for auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getAllFloors = async () => {
  return await apiFetch("/parking-floors", {
    method: "GET",
    headers: getAuthHeaders(),
  });
};

export const createFloor = async (data) => {
  return await apiFetch("/parking-floors", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
};

export const updateFloorLayout = async (id, layoutData) => {
  return await apiFetch(`/parking-floors/${id}/layout`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ layoutData }),
  });
};

export const deleteFloor = async (id) => {
  return await apiFetch(`/parking-floors/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
};

export const getFloorSlots = async (id) => {
  return await apiFetch(`/parking-floors/${id}/slots`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
};

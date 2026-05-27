import { apiFetch } from './api';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
});

/** GET /api/vehicles — lấy danh sách xe của user */
export const getMyVehicles = () =>
  apiFetch('/vehicles', { headers: authHeader() });

/** POST /api/vehicles — thêm xe mới */
export const addVehicle = (data) =>
  apiFetch('/vehicles', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(data),
  });

/** PUT /api/vehicles/:id — cập nhật xe */
export const updateVehicle = (id, data) =>
  apiFetch(`/vehicles/${id}`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify(data),
  });

/** DELETE /api/vehicles/:id — xóa xe */
export const deleteVehicle = (id) =>
  apiFetch(`/vehicles/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });

/** PATCH /api/vehicles/:id/default — đặt xe mặc định */
export const setDefaultVehicle = (id) =>
  apiFetch(`/vehicles/${id}/default`, {
    method: 'PATCH',
    headers: authHeader(),
  });

/** POST /api/ai/scan-registration-card — quét cà vẹt xe bằng AI */
export const scanRegistrationCard = (imageBase64) =>
  apiFetch('/ai/scan-registration-card', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ image: imageBase64 }),
  });

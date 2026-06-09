import { apiFetch, API_BASE } from './api';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
});

/** GET /api/services — Lấy danh sách dịch vụ (public) */
export const getServices = (activeOnly = true) =>
  apiFetch(`/services?activeOnly=${activeOnly}`);

/** GET /api/services/:id — Lấy chi tiết dịch vụ (public) */
export const getServiceById = (id) =>
  apiFetch(`/services/${id}`);

/** 
 * POST /api/admin/services — Thêm dịch vụ mới (cần upload file) 
 * Vì có FormData, chúng ta dùng fetch thuần thay vì apiFetch (do apiFetch mặc định Content-Type: application/json)
 */
export const createService = async (formData) => {
  const res = await fetch(`${API_BASE}/admin/services`, {
    method: 'POST',
    headers: authHeader(),
    body: formData,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
};

/** 
 * PUT /api/admin/services/:id — Cập nhật dịch vụ 
 */
export const updateService = async (id, formData) => {
  const res = await fetch(`${API_BASE}/admin/services/${id}`, {
    method: 'PUT',
    headers: authHeader(),
    body: formData,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
};

/** DELETE /api/admin/services/:id — Xóa dịch vụ */
export const deleteService = (id) =>
  apiFetch(`/admin/services/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });

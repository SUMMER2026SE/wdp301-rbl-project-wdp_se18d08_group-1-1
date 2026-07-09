import { apiClient } from '@/services/api/client';
import type { APIResponse } from '@/types/api';
import type { Service } from '@/types/booking.types';

class ServiceService {
  async getActiveServices() {
    const response = await apiClient.get<APIResponse<Service[]>>('/services', {
      params: { isActive: true },
    });
    return response.data || [];
  }

  async getServiceById(serviceId: string) {
    const response = await apiClient.get<APIResponse<Service>>(`/services/${serviceId}`);
    return response.data;
  }
}

export const serviceService = new ServiceService();
export default serviceService;

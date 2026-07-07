import type { APIResponse } from '@/types/api';
import type { CreateVehicleRequest, UpdateVehicleRequest, Vehicle } from '@/types/models';

import { apiClient } from './client';

class VehiclesService {
  getMyVehicles() {
    return apiClient.get<APIResponse<Vehicle[]>>('/vehicles');
  }

  getVehicleById(id: string) {
    return apiClient.get<APIResponse<Vehicle>>(`/vehicles/${id}`);
  }

  addVehicle(data: CreateVehicleRequest) {
    return apiClient.post<APIResponse<Vehicle>>('/vehicles', data);
  }

  updateVehicle(id: string, data: UpdateVehicleRequest) {
    return apiClient.put<APIResponse<Vehicle>>(`/vehicles/${id}`, data);
  }

  deleteVehicle(id: string) {
    return apiClient.delete<APIResponse>(`/vehicles/${id}`);
  }

  setDefaultVehicle(id: string) {
    return apiClient.patch<APIResponse<Vehicle>>(`/vehicles/${id}/default`);
  }
}

export const vehiclesService = new VehiclesService();

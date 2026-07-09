import { apiClient } from '@/services/api/client';
import type { APIResponse } from '@/types/api';
import type { ParkingFloor, Slot } from '@/types/booking.types';

class ParkingFloorService {
  async getParkingFloors() {
    const response = await apiClient.get<APIResponse<ParkingFloor[]>>('/parking-floors');
    return (response.data || []).sort((a, b) => a.floorNumber - b.floorNumber);
  }

  async getFloorById(floorId: string) {
    const response = await apiClient.get<APIResponse<ParkingFloor>>(`/parking-floors/${floorId}`);
    return response.data;
  }

  async getSlotsByFloor(floorId: string) {
    const response = await apiClient.get<APIResponse<Slot[]>>(`/parking-floors/${floorId}/slots`);
    return response.data || [];
  }
}

export const parkingFloorService = new ParkingFloorService();
export default parkingFloorService;

import api from './api';

export const controlService = {
  controlWaterPump: async (deviceId: string): Promise<void> => {
    await api.post(`/devices/${deviceId}/control`, {
      action: 'water',
      mode: 'MANUAL',
    });
  },

  controlSupplement: async (deviceId: string): Promise<void> => {
    await api.post(`/devices/${deviceId}/control`, {
      action: 'nutrient',
      mode: 'MANUAL',
    });
  },
};

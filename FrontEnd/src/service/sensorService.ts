import axios from 'axios';
import api, { AI_API_BASE_URL } from './api';

export interface SensorData {
  temperature: number;
  humidity: number;
  soilMoisture: number;
  illuminance: number;
  isAbnormal: boolean;
  emotionStatus?: 'happy' | 'sleepy' | 'thirsty' | 'overwatered' | 'cold' | 'hot' | 'stuffy' | 'sick';
  emotionMessage?: string;
  gifName?: string;
  createdAt: string;
}

interface SensorApiResponse {
  deviceId: string;
  data: SensorData[];
}

export const sensorService = {
  getLatestSensorData: async (deviceId: string = 'RASP_001'): Promise<SensorData> => {
    try {
      const response = await api.get<SensorApiResponse>(`/devices/${deviceId}/sensors`);
      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      }
    } catch {
      const response = await axios.get(`${AI_API_BASE_URL}/plants/current?deviceId=${deviceId}`);
      return {
        ...response.data,
        createdAt: response.data.measuredAt,
      };
    }
    throw new Error('No sensor data available');
  },

  getSensorHistoryByDate: async (deviceId: string = 'RASP_001', date: string): Promise<SensorData[]> => {
    const response = await api.get<SensorApiResponse>(`/devices/${deviceId}/history/day`, {
      params: { date },
    });
    return response.data.data ?? [];
  },

  getSensorHistory: async (deviceId: string = 'RASP_001', limit: number = 200): Promise<SensorData[]> => {
    const response = await api.get<SensorApiResponse>(`/devices/${deviceId}/history`, {
      params: { limit },
    });
    return response.data.data ?? [];
  },
};

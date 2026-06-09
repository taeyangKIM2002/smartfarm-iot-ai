import axios from 'axios';

export interface DiseaseStats {
  greenRatio: number;
  yellowRatio: number;
  brownRatio: number;
  darkSpotRatio: number;
}

export interface DiseaseAnalysis {
  status: 'healthy' | 'watch' | 'suspected';
  label: string;
  confidence: number;
  message: string;
  action?: string;
  isSick: boolean;
  analyzedAt: string;
  modelAvailable: boolean;
  source: string;
  modelName?: string;
  detections: Array<{
    label: string;
    confidence: number;
    box: { x: number; y: number; width: number; height: number };
  }>;
}

export const diseaseService = {
  analyze: async (stats: DiseaseStats, image?: string): Promise<DiseaseAnalysis> => {
    const response = await axios.post<DiseaseAnalysis>('http://127.0.0.1:8000/api/v1/disease/analyze', {
      stats,
      image,
    });

    return response.data;
  },
};

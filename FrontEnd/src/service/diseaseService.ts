import axios from 'axios';
import { AI_API_BASE_URL } from './api';

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

interface AnalyzeOptions {
  strictModelOnly?: boolean;
  binaryPlantLabels?: boolean;
}

export const diseaseService = {
  analyze: async (stats: DiseaseStats, image?: string, options: AnalyzeOptions = {}): Promise<DiseaseAnalysis> => {
    const response = await axios.post<DiseaseAnalysis>(`${AI_API_BASE_URL}/disease/analyze`, {
      stats,
      image,
      strictModelOnly: options.strictModelOnly ?? false,
      binaryPlantLabels: options.binaryPlantLabels ?? false,
    });

    return response.data;
  },
};

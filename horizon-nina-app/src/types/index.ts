export interface HorizonPoint {
  azimuth: number;      // 0-360 grados
  altitude: number;     // -90 a 90 grados
  timestamp: number;    // Unix timestamp
  accuracy: number;     // Precisión del sensor
}

export interface HorizonData {
  id: string;
  name: string;
  createdAt: number;
  points: HorizonPoint[];
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  metadata: {
    deviceModel: string;
    appVersion: string;
    sensorAccuracy: number;
  };
}

export interface ExportOptions {
  resolution: number;     // Grados entre puntos
  format: 'standard' | 'detailed';
  includeMetadata: boolean;
  interpolateGaps: boolean;
}

export interface DeviceMotionData {
  rotation: {
    alpha: number;    // Yaw (azimut)
    beta: number;     // Pitch
    gamma: number;    // Roll
  };
  acceleration: {
    x: number;
    y: number;
    z: number;
  };
  timestamp: number;
}

export interface SensorAccuracy {
  motion: number;
  orientation: number;
  overall: number;
}

export interface CalibrationResult {
  success: boolean;
  accuracy: SensorAccuracy;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface HorizonStatistics {
  minAltitude: number;
  maxAltitude: number;
  avgAltitude: number;
  totalPoints: number;
  coverage: number; // percentage
}
export interface SensorReading {
  timestamp: number;
  azimuth: number; // 0-360 grados
  altitude: number; // -90 a 90 grados
  accuracy: number; // precisión en grados
  latitude?: number; // GPS para corrección
  longitude?: number;
}

export interface HorizonPoint {
  id: string;
  sessionId: string;
  azimuth: number;
  altitude: number;
  timestamp: Date;
  accuracy: number;
  notes?: string;
}

export interface HorizonSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  totalPoints: number;
}

export interface CSVExportConfig {
  filename: string;
  delimiter: ',' | ';';
  includeTimestamp: boolean;
  coordinateFormat: 'decimal' | 'dms';
}

export interface SensorStatus {
  hasGyroscope: boolean;
  hasAccelerometer: boolean;
  hasMagnetometer: boolean;
  hasGeolocation: boolean;
  hasCamera: boolean;
  permissions: {
    deviceOrientation: PermissionState | null;
    geolocation: PermissionState | null;
    camera: PermissionState | null;
  };
}

export type AccuracyLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface CaptureStatus {
  isCapturing: boolean;
  isStable: boolean;
  stabilityScore: number;
  accuracy: AccuracyLevel;
  message?: string;
}
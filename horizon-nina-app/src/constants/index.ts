export const APP_NAME = "Horizon NINA";
export const APP_VERSION = "1.0.0";

export const SENSOR_CONFIG = {
  UPDATE_INTERVAL: 100, // ms
  MIN_ACCURACY: 0.7,
  BUFFER_SIZE: 12,
  CALIBRATION_DURATION: 3000, // ms
} as const;

export const HORIZON_CONFIG = {
  MIN_POINTS: 8,
  MAX_POINTS: 360,
  DEFAULT_RESOLUTION: 5, // degrees
  MIN_ALTITUDE: -90,
  MAX_ALTITUDE: 90,
  FULL_CIRCLE: 360,
} as const;

export const DECLINATION_DEG = 0; // Ajusta la declinación magnética si usas magneticHeading
export const AZIMUTH_OFFSET_DEG = 0; // Corrección manual si 0° no coincide con el norte

export const STORAGE_KEYS = {
  HORIZONS: "@horizon_nina:horizons",
  SETTINGS: "@horizon_nina:settings",
  LAST_LOCATION: "@horizon_nina:last_location",
} as const;

export const EXPORT_CONFIG = {
  DEFAULT_FILENAME: "horizon_nina",
  FILE_EXTENSION: ".hzn",
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

export const UI_CONFIG = {
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  REFRESH_INTERVAL: 1000, // ms
} as const;

import { useState, useEffect, useCallback } from "react";
import { sensorService } from "../services/sensorService";
import { DeviceMotionData, SensorAccuracy } from "../types";

export const useDeviceMotion = () => {
  const [motionData, setMotionData] = useState<DeviceMotionData | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [accuracy, setAccuracy] = useState<SensorAccuracy>({
    motion: 0,
    orientation: 0,
    overall: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const handleMotionData = useCallback((data: DeviceMotionData) => {
    setMotionData(data);
    const currentAccuracy = sensorService.getSensorAccuracy();
    setAccuracy(currentAccuracy);
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      await sensorService.startMotionUpdates(handleMotionData);
      setIsListening(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start motion sensors"
      );
      setIsListening(false);
    }
  }, [handleMotionData]);

  const stopListening = useCallback(async () => {
    try {
      await sensorService.stopMotionUpdates();
      setIsListening(false);
      setMotionData(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to stop motion sensors"
      );
    }
  }, []);

  const calibrate = useCallback(async () => {
    try {
      setError(null);
      const result = await sensorService.calibrateSensors();
      setAccuracy(result.accuracy);
      return result;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to calibrate sensors"
      );
      return {
        success: false,
        accuracy,
        message: "Calibration failed",
      };
    }
  }, [accuracy]);

  useEffect(() => {
    return () => {
      if (isListening) {
        sensorService.stopMotionUpdates();
      }
    };
  }, [isListening]);

  return {
    motionData,
    isListening,
    accuracy,
    error,
    startListening,
    stopListening,
    calibrate,
  };
};

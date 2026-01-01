import { useState, useEffect, useCallback } from "react";
import { sensorService } from "../services/sensorService";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import { setTiltBaseline } from "../utils/calculations";
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
  const [headingSub, setHeadingSub] =
    useState<Location.LocationSubscription | null>(null);
  const [lastHeading, setLastHeading] = useState<number | null>(null);
  const [magSub, setMagSub] = useState<any>(null);
  const [magData, setMagData] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);

  const handleMotionData = useCallback(
    (data: DeviceMotionData) => {
      let preferredHeading: number | null = null;
      if (lastHeading != null) preferredHeading = lastHeading;
      else if (magData) {
        const pitch = (data.rotation.beta || 0) * (Math.PI / 180);
        const roll = (data.rotation.gamma || 0) * (Math.PI / 180);
        const mx = magData.x,
          my = magData.y,
          mz = magData.z;
        const xh =
          mx * Math.cos(pitch) +
          my * Math.sin(roll) * Math.sin(pitch) +
          mz * Math.cos(roll) * Math.sin(pitch);
        const yh = my * Math.cos(roll) - mz * Math.sin(roll);
        let hdg = Math.atan2(yh, xh) * (180 / Math.PI);
        if (hdg < 0) hdg += 360;
        preferredHeading = Math.round(hdg);
      }

      const nextData: DeviceMotionData = {
        ...data,
        rotation: {
          ...data.rotation,
          alpha: preferredHeading ?? data.rotation.alpha,
        },
      };
      setMotionData(nextData);
      const currentAccuracy = sensorService.getSensorAccuracy();
      setAccuracy(currentAccuracy);
    },
    [lastHeading, magData]
  );

  const startListening = useCallback(async () => {
    try {
      setError(null);
      await sensorService.startMotionUpdates(handleMotionData);
      setIsListening(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const sub = await Location.watchHeadingAsync((h) => {
          const heading = h.trueHeading ?? h.magHeading ?? 0;
          const normalized = Math.round(((heading % 360) + 360) % 360);
          setLastHeading(normalized);
        });
        setHeadingSub(sub);
      }
      Magnetometer.setUpdateInterval(100);
      const msub = Magnetometer.addListener((m) => {
        setMagData({ x: m.x || 0, y: m.y || 0, z: m.z || 0 });
      });
      setMagSub(msub);
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
      if (headingSub) {
        headingSub.remove();
        setHeadingSub(null);
      }
      if (magSub) {
        magSub.remove();
        setMagSub(null);
      }
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
      if (motionData) {
        setTiltBaseline(motionData.rotation.beta);
      }
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
  }, [accuracy, motionData]);

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

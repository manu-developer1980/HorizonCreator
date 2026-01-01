import { DeviceMotion } from 'expo-sensors';
import * as Location from 'expo-location';
import { DeviceMotionData, SensorAccuracy, CalibrationResult } from '../types';
import { SENSOR_CONFIG } from '../constants';

class SensorService {
  private subscription: any = null;
  private headingSubscription: Location.LocationSubscription | null = null;
  private isListening = false;
  private accuracy: SensorAccuracy = {
    motion: 0,
    orientation: 0,
    overall: 0,
  };
  private lastRotation: { alpha: number; beta: number; gamma: number } | null = null;
  private deltaBuffer: number[] = [];
  private lastHeading: number | null = null;

  async startMotionUpdates(callback: (data: DeviceMotionData) => void): Promise<void> {
    try {
      await DeviceMotion.setUpdateInterval(SENSOR_CONFIG.UPDATE_INTERVAL);
      // Intenta suscribirte al heading absoluto del dispositivo
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        this.headingSubscription = await Location.watchHeadingAsync((h) => {
          const heading = (h.trueHeading ?? h.magHeading ?? 0);
          this.lastHeading = Math.round(((heading % 360) + 360) % 360);
        });
      }
      
      this.subscription = DeviceMotion.addListener((motionData) => {
        if (!motionData.rotation || !motionData.acceleration) {
          return;
        }

        const processedData: DeviceMotionData = {
          rotation: {
            // Usa heading absoluto si está disponible; en caso contrario, yaw
            alpha: this.lastHeading ?? (motionData.rotation.alpha || 0) * (180 / Math.PI),
            beta: (motionData.rotation.beta || 0) * (180 / Math.PI),
            gamma: (motionData.rotation.gamma || 0) * (180 / Math.PI),
          },
          acceleration: {
            x: motionData.acceleration.x || 0,
            y: motionData.acceleration.y || 0,
            z: motionData.acceleration.z || 0,
          },
          timestamp: motionData.timestamp || Date.now(),
        };

        this.updateAccuracy(processedData);
        callback(processedData);
      });

      this.isListening = true;
    } catch (error) {
      console.error('Error starting motion updates:', error);
      throw new Error('Failed to start motion sensor updates');
    }
  }

  async stopMotionUpdates(): Promise<void> {
    try {
      if (this.subscription) {
        this.subscription.remove();
        this.subscription = null;
      }
      if (this.headingSubscription) {
        this.headingSubscription.remove();
        this.headingSubscription = null;
      }
      this.isListening = false;
    } catch (error) {
      console.error('Error stopping motion updates:', error);
      throw new Error('Failed to stop motion sensor updates');
    }
  }

  async calibrateSensors(): Promise<CalibrationResult> {
    return new Promise((resolve) => {
      let samples: DeviceMotionData[] = [];
      const startTime = Date.now();
      
      const calibrationInterval = setInterval(() => {
        if (Date.now() - startTime >= SENSOR_CONFIG.CALIBRATION_DURATION) {
          clearInterval(calibrationInterval);
          
          if (samples.length > 0) {
            const avgAccuracy = samples.reduce((sum, sample) => {
              const magnitude = Math.sqrt(
                sample.acceleration.x ** 2 + 
                sample.acceleration.y ** 2 + 
                sample.acceleration.z ** 2
              );
              return sum + Math.min(1, magnitude / 9.8);
            }, 0) / samples.length;

            this.accuracy = {
              motion: Math.round(avgAccuracy * 100) / 100,
              orientation: Math.round(avgAccuracy * 100) / 100,
              overall: Math.round(avgAccuracy * 100) / 100,
            };

            resolve({
              success: this.accuracy.overall >= SENSOR_CONFIG.MIN_ACCURACY,
              accuracy: this.accuracy,
              message: this.accuracy.overall >= SENSOR_CONFIG.MIN_ACCURACY 
                ? 'Calibration successful' 
                : 'Low accuracy detected',
            });
          } else {
            resolve({
              success: false,
              accuracy: this.accuracy,
              message: 'No sensor data collected during calibration',
            });
          }
        }
      }, 100);

      // Collect samples during calibration
      const tempCallback = (data: DeviceMotionData) => {
        samples.push(data);
      };

      this.startMotionUpdates(tempCallback).then(() => {
        setTimeout(() => {
          this.stopMotionUpdates();
        }, SENSOR_CONFIG.CALIBRATION_DURATION);
      });
    });
  }

  getSensorAccuracy(): SensorAccuracy {
    return { ...this.accuracy };
  }

  private updateAccuracy(data: DeviceMotionData): void {
    const rot = data.rotation;
    if (this.lastRotation) {
      const deltaAz = Math.abs(rot.alpha - this.lastRotation.alpha);
      const deltaAlt = Math.abs(rot.beta - this.lastRotation.beta);
      const delta = deltaAz + deltaAlt;
      this.deltaBuffer.push(delta);
      if (this.deltaBuffer.length > SENSOR_CONFIG.BUFFER_SIZE) this.deltaBuffer.shift();
      const avgDelta = this.deltaBuffer.reduce((s, v) => s + v, 0) / (this.deltaBuffer.length || 1);
      const stability = Math.max(0, Math.min(1, 1 - avgDelta / 30));
      this.accuracy = {
        motion: stability,
        orientation: stability,
        overall: stability,
      };
    }
    this.lastRotation = { ...rot };
  }

  isListening(): boolean {
    return this.isListening;
  }
}

export const sensorService = new SensorService();

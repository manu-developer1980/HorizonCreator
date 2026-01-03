import { Accelerometer, Magnetometer } from "expo-sensors";
import { DeviceMotionData, SensorAccuracy, CalibrationResult } from "../types";
import { SENSOR_CONFIG } from "../constants";

class SensorService {
  private accelSubscription: any = null;
  private magSubscription: any = null;
  private isListening = false;
  private accuracy: SensorAccuracy = {
    motion: 0,
    orientation: 0,
    overall: 0,
  };

  // Buffers for LPF
  private lastG: { x: number; y: number; z: number } | null = null;
  private lastM: { x: number; y: number; z: number } | null = null;

  // Buffers for stability calculation
  private deltaBuffer: number[] = [];
  private lastAz: number | null = null;
  private lastAlt: number | null = null;

  async startMotionUpdates(
    callback: (data: DeviceMotionData) => void
  ): Promise<void> {
    try {
      // Set update intervals
      await Accelerometer.setUpdateInterval(SENSOR_CONFIG.UPDATE_INTERVAL);
      await Magnetometer.setUpdateInterval(SENSOR_CONFIG.UPDATE_INTERVAL);

      this.accelSubscription = Accelerometer.addListener((accelData) => {
        // Apply LPF to Gravity
        if (this.lastG) {
          const alpha = 0.2; // LPF factor (0-1). Lower is smoother/slower.
          this.lastG = {
            x: this.lastG.x + alpha * (accelData.x - this.lastG.x),
            y: this.lastG.y + alpha * (accelData.y - this.lastG.y),
            z: this.lastG.z + alpha * (accelData.z - this.lastG.z),
          };
        } else {
          this.lastG = accelData;
        }

        this.processSensorFusion(callback);
      });

      this.magSubscription = Magnetometer.addListener((magData) => {
        // Apply LPF to Magnetometer
        if (this.lastM) {
          const alpha = 0.1; // Smoother for compass
          this.lastM = {
            x: this.lastM.x + alpha * (magData.x - this.lastM.x),
            y: this.lastM.y + alpha * (magData.y - this.lastM.y),
            z: this.lastM.z + alpha * (magData.z - this.lastM.z),
          };
        } else {
          this.lastM = magData;
        }

        this.processSensorFusion(callback);
      });

      this.isListening = true;
    } catch (error) {
      console.error("Error starting motion updates:", error);
      throw new Error("Failed to start motion sensor updates");
    }
  }

  private processSensorFusion(callback: (data: DeviceMotionData) => void) {
    if (!this.lastG || !this.lastM) return;

    // 1. Calculate Pitch (Altitude) from Gravity
    const G = this.lastG;
    const M = this.lastM;

    // Normalize G
    const normG = Math.sqrt(G.x * G.x + G.y * G.y + G.z * G.z);
    const g = { x: G.x / normG, y: G.y / normG, z: G.z / normG };

    // Calculate Altitude (Pitch)
    // Formula: atan2(z, y) * 180/PI
    // Vertical (z=0, y=1) -> 0.
    // Zenith (z=1, y=0) -> 90.
    // Face Down (z=-1, y=0) -> -90.

    // Inverted logic as requested:
    // If we want +90 when looking UP (Zenith), and -90 when looking DOWN (Nadir).
    // Pointing Camera UP (Screen Down) -> G.z is negative -> atan2 gives negative. We want Positive.
    // Pointing Camera DOWN (Screen Up) -> G.z is positive -> atan2 gives positive. We want Negative.
    let altitude = -Math.atan2(G.z, G.y) * (180 / Math.PI);

    // 2. Calculate Azimuth
    // Cross Product: a x b = (ay*bz - az*by, az*bx - ax*bz, ax*by - ay*bx)
    const Ex = M.y * G.z - M.z * G.y;
    const Ey = M.z * G.x - M.x * G.z;
    const Ez = M.x * G.y - M.y * G.x;
    const normE = Math.sqrt(Ex * Ex + Ey * Ey + Ez * Ez);
    const E = { x: Ex / normE, y: Ey / normE, z: Ez / normE };

    const Nx = G.y * E.z - G.z * E.y;
    const Ny = G.z * E.x - G.x * E.z;
    const Nz = G.x * E.y - G.y * E.x;
    const normN = Math.sqrt(Nx * Nx + Ny * Ny + Nz * Nz);
    const N = { x: Nx / normN, y: Ny / normN, z: Nz / normN };

    // Azimuth calculation
    // We use the projection of the North and East vectors onto the Z-axis (Camera axis).
    // When holding the device vertically (portrait), the Y-axis points to the sky (Zenith),
    // so its projection on the horizontal plane is unstable (Gimbal Lock).
    // The Camera points along the -Z axis.
    // We calculate the azimuth of the -Z axis projected onto the horizontal plane.
    let azimuth = Math.atan2(-E.z, -N.z) * (180 / Math.PI);
    if (azimuth < 0) azimuth += 360;

    // Update stability
    this.updateStability(azimuth, altitude);

    const processedData: DeviceMotionData = {
      rotation: {
        alpha: azimuth,
        beta: altitude,
        gamma: 0, // We don't need roll for now
      },
      acceleration: {
        x: G.x,
        y: G.y,
        z: G.z,
      },
      timestamp: Date.now(),
    };

    callback(processedData);
  }

  private updateStability(az: number, alt: number) {
    if (this.lastAz !== null && this.lastAlt !== null) {
      // Calculate minimal difference for circular azimuth
      let dAz = Math.abs(az - this.lastAz);
      if (dAz > 180) dAz = 360 - dAz;

      const dAlt = Math.abs(alt - this.lastAlt);
      const delta = dAz + dAlt;

      this.deltaBuffer.push(delta);
      if (this.deltaBuffer.length > SENSOR_CONFIG.BUFFER_SIZE)
        this.deltaBuffer.shift();

      const avgDelta =
        this.deltaBuffer.reduce((a, b) => a + b, 0) / this.deltaBuffer.length;

      // Stability score: 1 if still, 0 if moving fast
      // Threshold: if avgDelta < 0.5 deg per frame -> Stable
      const stability = Math.max(0, Math.min(1, 1 - avgDelta / 5));

      this.accuracy = {
        motion: stability,
        orientation: stability,
        overall: stability,
      };
    }
    this.lastAz = az;
    this.lastAlt = alt;
  }

  async stopMotionUpdates(): Promise<void> {
    try {
      if (this.accelSubscription) {
        this.accelSubscription.remove();
        this.accelSubscription = null;
      }
      if (this.magSubscription) {
        this.magSubscription.remove();
        this.magSubscription = null;
      }
      this.isListening = false;
      this.lastG = null;
      this.lastM = null;
    } catch (error) {
      console.error("Error stopping motion updates:", error);
      throw new Error("Failed to stop motion sensor updates");
    }
  }

  async calibrateSensors(): Promise<CalibrationResult> {
    // With manual fusion, calibration is just "Check stability" or "Reset offsets"
    // For now we just return current stability
    return {
      success: this.accuracy.overall > 0.6,
      accuracy: this.accuracy,
      message: "Sensors active",
    };
  }

  getSensorAccuracy(): SensorAccuracy {
    return { ...this.accuracy };
  }

  isListening(): boolean {
    return this.isListening;
  }
}

export const sensorService = new SensorService();

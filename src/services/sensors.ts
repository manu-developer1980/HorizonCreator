import type { SensorReading, SensorStatus, AccuracyLevel } from "../types";

class SensorService {
  private orientationListener:
    | ((event: DeviceOrientationEvent) => void)
    | null = null;
  private motionListener: ((event: DeviceMotionEvent) => void) | null = null;
  private geolocationWatchId: number | null = null;
  private currentReading: SensorReading | null = null;
  private readingCallbacks: ((reading: SensorReading) => void)[] = [];
  private isListening = false;
  // private lastStableReading: SensorReading | null = null;
  private stabilityThreshold = 2.0; // degrees
  private stabilityWindow = 1000; // ms
  private readingHistory: SensorReading[] = [];

  async checkPermissions(): Promise<SensorStatus> {
    const status: SensorStatus = {
      hasGyroscope: "DeviceOrientationEvent" in window,
      hasAccelerometer: "DeviceMotionEvent" in window,
      hasMagnetometer: "DeviceOrientationEvent" in window,
      hasGeolocation: "geolocation" in navigator,
      hasCamera:
        "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices,
      permissions: {
        deviceOrientation: null,
        geolocation: null,
        camera: null,
      },
    };

    // Check device orientation permission
    if (status.hasGyroscope && "requestPermission" in DeviceOrientationEvent) {
      try {
        const permission = await (
          DeviceOrientationEvent as any
        ).requestPermission();
        status.permissions.deviceOrientation = permission;
      } catch (error) {
        console.warn("Device orientation permission denied:", error);
        status.permissions.deviceOrientation = "denied";
      }
    }

    // Check geolocation permission
    if (status.hasGeolocation && "permissions" in navigator) {
      try {
        const result = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        status.permissions.geolocation = result.state;
      } catch (error) {
        console.warn("Geolocation permission check failed:", error);
      }
    }

    // Check camera permission
    if (status.hasCamera && "permissions" in navigator) {
      try {
        const result = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        status.permissions.camera = result.state;
      } catch (error) {
        console.warn("Camera permission check failed:", error);
      }
    }

    return status;
  }

  async requestPermissions(): Promise<boolean> {
    const results: boolean[] = [];

    // Request device orientation permission
    if ("requestPermission" in DeviceOrientationEvent) {
      try {
        const permission = await (
          DeviceOrientationEvent as any
        ).requestPermission();
        results.push(permission === "granted");
      } catch (error) {
        console.error("Device orientation permission request failed:", error);
        results.push(false);
      }
    } else {
      results.push(true); // Assume granted if no permission API
    }

    if (
      typeof DeviceMotionEvent !== "undefined" &&
      "requestPermission" in (DeviceMotionEvent as any)
    ) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        results.push(permission === "granted");
      } catch (error) {
        console.error("Device motion permission request failed:", error);
        results.push(false);
      }
    }

    // Request geolocation permission by getting current position
    if ("geolocation" in navigator) {
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
          });
        });
        results.push(true);
      } catch (error) {
        console.error("Geolocation permission request failed:", error);
        results.push(false);
      }
    } else {
      results.push(false);
    }

    return results.every((result) => result);
  }

  async enableSensorsWithGesture(
    callback?: (reading: SensorReading) => void
  ): Promise<boolean> {
    const ok = await this.requestPermissions();
    this.stopListening();
    this.startListening(callback);
    return ok;
  }

  startListening(callback?: (reading: SensorReading) => void): void {
    if (this.isListening) {
      console.warn("Sensor service already listening");
      return;
    }

    if (callback) {
      this.readingCallbacks.push(callback);
    }

    this.isListening = true;

    // Device orientation listener
    this.orientationListener = (event: DeviceOrientationEvent) => {
      this.processOrientationEvent(event);
    };

    // Device motion listener for additional stability data
    this.motionListener = (event: DeviceMotionEvent) => {
      this.processMotionEvent(event);
    };

    window.addEventListener("deviceorientation", this.orientationListener);
    // Fallback absolute orientation when available (Android)
    window.addEventListener(
      "deviceorientationabsolute" as any,
      this.orientationListener as any
    );
    window.addEventListener("devicemotion", this.motionListener);

    // Start geolocation watch for location-based corrections
    if ("geolocation" in navigator) {
      this.geolocationWatchId = navigator.geolocation.watchPosition(
        (position) => {
          this.updateGeolocation(position);
        },
        (error) => {
          console.warn("Geolocation error:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    }

    // Provide a default reading so UI can operate even si los sensores tardan
    const defaultReading: SensorReading = {
      timestamp: Date.now(),
      azimuth: 0,
      altitude: 0,
      accuracy: 10,
    } as SensorReading;
    this.updateReading(defaultReading);

    console.log("Sensor service started listening");
  }

  stopListening(): void {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;
    this.readingCallbacks = [];

    if (this.orientationListener) {
      window.removeEventListener("deviceorientation", this.orientationListener);
      this.orientationListener = null;
    }

    if (this.motionListener) {
      window.removeEventListener("devicemotion", this.motionListener);
      this.motionListener = null;
    }

    if (this.geolocationWatchId !== null) {
      navigator.geolocation.clearWatch(this.geolocationWatchId);
      this.geolocationWatchId = null;
    }

    console.log("Sensor service stopped listening");
  }

  private processOrientationEvent(event: DeviceOrientationEvent): void {
    const reading = this.calculateSensorReading(event);
    this.updateReading(reading);
  }

  private processMotionEvent(event: DeviceMotionEvent): void {
    // Use motion data to assess stability
    if (event.acceleration && event.rotationRate) {
      const acceleration = event.acceleration;
      const rotationRate = event.rotationRate;

      // Calculate motion magnitude
      const accelMagnitude = Math.sqrt(
        Math.pow(acceleration.x || 0, 2) +
          Math.pow(acceleration.y || 0, 2) +
          Math.pow(acceleration.z || 0, 2)
      );

      const rotationMagnitude = Math.sqrt(
        Math.pow(rotationRate.alpha || 0, 2) +
          Math.pow(rotationRate.beta || 0, 2) +
          Math.pow(rotationRate.gamma || 0, 2)
      );

      // Assess stability based on motion
      // const isStable = accelMagnitude < 0.5 && rotationMagnitude < 0.5;

      if (this.currentReading) {
        this.currentReading.accuracy = this.calculateAccuracy(
          accelMagnitude,
          rotationMagnitude
        );
      }
    }
  }

  private calculateSensorReading(event: DeviceOrientationEvent): SensorReading {
    const alpha = event.alpha ?? 0;
    const beta = event.beta ?? 0;
    const gamma = event.gamma ?? 0;
    const webkitHeading = (event as any).webkitCompassHeading as
      | number
      | undefined;
    const azimuth = this.getHeading(webkitHeading, alpha, beta, gamma);
    const altitude = Math.max(0, Math.min(90, Math.abs(beta)));

    return {
      timestamp: Date.now(),
      azimuth,
      altitude,
      accuracy: 5.0, // Default accuracy, will be updated by motion data
      latitude: this.currentReading?.latitude,
      longitude: this.currentReading?.longitude,
    };
  }

  private getHeading(
    webkitHeading: number | undefined,
    alpha: number,
    beta: number,
    gamma: number
  ): number {
    if (typeof webkitHeading === "number") {
      return this.normalizeAngle(webkitHeading);
    }
    const degtorad = Math.PI / 180;
    const x = beta * degtorad;
    const y = gamma * degtorad;
    const z = alpha * degtorad;
    const cY = Math.cos(y);
    const cZ = Math.cos(z);
    const sX = Math.sin(x);
    const sY = Math.sin(y);
    const sZ = Math.sin(z);
    const Vx = -cZ * sY - sZ * sX * cY;
    const Vy = -sZ * sY + cZ * sX * cY;
    let heading = Math.atan(Vx / Vy);
    if (Vy < 0) heading += Math.PI;
    else if (Vx < 0) heading += 2 * Math.PI;
    heading *= 180 / Math.PI;
    return this.normalizeAngle(heading);
  }

  private updateGeolocation(position: GeolocationPosition): void {
    if (this.currentReading) {
      this.currentReading.latitude = position.coords.latitude;
      this.currentReading.longitude = position.coords.longitude;
    }
  }

  private updateReading(reading: SensorReading): void {
    this.currentReading = reading;
    this.readingHistory.push(reading);

    // Keep only recent readings for stability analysis
    const cutoffTime = Date.now() - this.stabilityWindow;
    this.readingHistory = this.readingHistory.filter(
      (r) => r.timestamp > cutoffTime
    );

    // Assess stability based on recent readings
    if (this.readingHistory.length > 5) {
      const stability = this.assessStability();
      reading.accuracy = this.calculateAccuracyFromStability(stability);
      reading.accuracy = Math.max(0.5, Math.min(10.0, reading.accuracy));
    }

    // Notify callbacks
    this.readingCallbacks.forEach((callback) => callback(reading));
  }

  private assessStability(): number {
    if (this.readingHistory.length < 5) {
      return 1.0; // Not enough data
    }

    const recentReadings = this.readingHistory.slice(-10);
    const azimuthVariations = recentReadings.map((r) => r.azimuth);
    const altitudeVariations = recentReadings.map((r) => r.altitude);

    // Calculate standard deviation
    const azimuthStdDev = this.calculateStandardDeviation(azimuthVariations);
    const altitudeStdDev = this.calculateStandardDeviation(altitudeVariations);

    // Normalize to 0-1 scale (lower is more stable)
    const maxAcceptableVariation = this.stabilityThreshold;
    const stability = Math.max(
      0,
      1 - (azimuthStdDev + altitudeStdDev) / (2 * maxAcceptableVariation)
    );

    return stability;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private calculateAccuracyFromStability(stability: number): number {
    // Map stability (0-1) to accuracy (0.5-10 degrees)
    return 10.0 - stability * 9.5;
  }

  private calculateAccuracy(
    accelMagnitude: number,
    rotationMagnitude: number
  ): number {
    // Simple accuracy calculation based on motion
    const motionScore = (accelMagnitude + rotationMagnitude) / 2;
    return Math.min(10, Math.max(0.5, 1.0 + motionScore * 5));
  }

  private normalizeAngle(angle: number): number {
    let normalized = angle % 360;
    if (normalized < 0) normalized += 360;
    return normalized;
  }

  // Magnetic declination is not applied in current implementation

  getCurrentReading(): SensorReading | null {
    return this.currentReading;
  }

  getAccuracyLevel(accuracy: number): AccuracyLevel {
    if (accuracy <= 1.0) return "excellent";
    if (accuracy <= 3.0) return "good";
    if (accuracy <= 5.0) return "fair";
    return "poor";
  }

  isDeviceStable(): boolean {
    if (!this.currentReading) return false;

    const stability = this.assessStability();
    return stability > 0.8; // 80% stability threshold
  }

  getStabilityScore(): number {
    return this.assessStability();
  }
}

export const sensorService = new SensorService();

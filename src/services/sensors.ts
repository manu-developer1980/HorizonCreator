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
    if (event.alpha !== null && event.beta !== null && event.gamma !== null) {
      const reading = this.calculateSensorReading(event);
      this.updateReading(reading);
    }
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
    const alpha = event.alpha || 0; // Azimuth (0-360)
    const beta = event.beta || 0; // Pitch (-180 to 180)
    // const gamma = event.gamma || 0; // Roll (-90 to 90)

    // Convert to azimuth and altitude
    const azimuth = this.normalizeAngle(alpha); // 0-360 degrees
    const altitude = Math.max(-90, Math.min(90, beta)); // -90 to 90 degrees

    return {
      timestamp: Date.now(),
      azimuth,
      altitude,
      accuracy: 5.0, // Default accuracy, will be updated by motion data
      latitude: this.currentReading?.latitude,
      longitude: this.currentReading?.longitude,
    };
  }

  private updateGeolocation(position: GeolocationPosition): void {
    if (this.currentReading) {
      this.currentReading.latitude = position.coords.latitude;
      this.currentReading.longitude = position.coords.longitude;

      // Adjust azimuth based on magnetic declination if available
      // This is a simplified approach - in a real app, you'd use a magnetic declination API
      const declination = this.estimateMagneticDeclination(
        position.coords.latitude,
        position.coords.longitude
      );

      this.currentReading.azimuth = this.normalizeAngle(
        this.currentReading.azimuth + declination
      );
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

  private estimateMagneticDeclination(
    latitude: number,
    longitude: number
  ): number {
    // Simplified magnetic declination estimation
    // In a real app, you'd use the NOAA magnetic declination API or similar

    // Rough approximation for common locations
    if (latitude > 30 && latitude < 60 && longitude > -130 && longitude < -60) {
      return -15; // North America
    } else if (
      latitude > 35 &&
      latitude < 70 &&
      longitude > -10 &&
      longitude < 40
    ) {
      return 2; // Europe
    } else if (
      latitude > -40 &&
      latitude < 10 &&
      longitude > 110 &&
      longitude < 160
    ) {
      return 8; // Australia
    }

    return 0; // Default
  }

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

import { DeviceMotionData, HorizonPoint } from "../types";

export function arithmeticMean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function circularMean(degrees: number[]): number {
  if (!degrees.length) return 0;
  const degToRad = Math.PI / 180;
  let sumSin = 0;
  let sumCos = 0;

  for (const d of degrees) {
    const r = d * degToRad;
    sumSin += Math.sin(r);
    sumCos += Math.cos(r);
  }

  const mean = (Math.atan2(sumSin, sumCos) * 180) / Math.PI;
  return mean < 0 ? mean + 360 : mean;
}

export function clampAltitude(value: number): number {
  if (!isFinite(value)) return 0;
  if (value < -90) return -90;
  if (value > 90) return 90;
  return Math.round(value * 10) / 10;
}

let tiltBaselineDeg = 0;
export function setTiltBaseline(deg: number) {
  tiltBaselineDeg = Math.round(deg);
}

export function computeAltitudeFromBeta(betaDeg: number): number {
  let alt = betaDeg - tiltBaselineDeg;
  if (alt < 0) alt = 0;
  if (alt > 90) alt = 90;
  return Math.round(alt * 10) / 10;
}

import { AZIMUTH_OFFSET_DEG } from "../constants";
export function normalizeAzimuth(azimuth: number, declination = 0): number {
  let normalized = (azimuth + declination + AZIMUTH_OFFSET_DEG + 360) % 360;
  return Math.round(normalized);
}

export function processDeviceMotionData(
  data: DeviceMotionData[],
  declination = 0
): HorizonPoint[] {
  return data.map((item) => {
    const azimuth = normalizeAzimuth(item.rotation.alpha, declination);
    const altitude = computeAltitudeFromBeta(item.rotation.beta);

    return {
      azimuth,
      altitude,
      timestamp: item.timestamp,
      accuracy: calculateAccuracy(item),
    };
  });
}

export function calculateAccuracy(data: DeviceMotionData): number {
  const { acceleration } = data;
  const magnitude = Math.sqrt(
    acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2
  );

  // Normalize to 0-1 range, where 1 is perfect (9.8 m/s² is standard gravity)
  const normalizedAccuracy = Math.min(1, magnitude / 9.8);
  return Math.round(normalizedAccuracy * 100) / 100;
}

export function interpolateGaps(
  points: HorizonPoint[],
  resolution = 5
): HorizonPoint[] {
  if (points.length === 0) return [];

  const result: HorizonPoint[] = [];
  const sortedPoints = [...points].sort((a, b) => a.azimuth - b.azimuth);

  for (let az = 0; az < 360; az += resolution) {
    const point = findNearestPoint(sortedPoints, az);
    if (point) {
      result.push({
        ...point,
        azimuth: az,
        timestamp: Date.now(),
      });
    }
  }

  return result;
}

function findNearestPoint(
  points: HorizonPoint[],
  targetAzimuth: number
): HorizonPoint | null {
  if (points.length === 0) return null;

  let nearest = points[0];
  let minDistance = Math.abs(points[0].azimuth - targetAzimuth);

  for (const point of points) {
    const distance = Math.abs(point.azimuth - targetAzimuth);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = point;
    }
  }

  return nearest;
}

export function calculateStatistics(points: HorizonPoint[]) {
  if (points.length === 0) {
    return {
      minAltitude: 0,
      maxAltitude: 0,
      avgAltitude: 0,
      totalPoints: 0,
      coverage: 0,
    };
  }

  const altitudes = points.map((p) => p.altitude);
  const minAltitude = Math.min(...altitudes);
  const maxAltitude = Math.max(...altitudes);
  const avgAltitude = arithmeticMean(altitudes);

  // Calculate coverage percentage (simplified)
  const uniqueAzimuths = new Set(
    points.map((p) => Math.round(p.azimuth / 5) * 5)
  );
  const coverage = (uniqueAzimuths.size / 72) * 100; // 72 points for 5-degree resolution

  return {
    minAltitude,
    maxAltitude,
    avgAltitude: Math.round(avgAltitude * 10) / 10,
    totalPoints: points.length,
    coverage: Math.round(coverage * 10) / 10,
  };
}

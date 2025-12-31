import Dexie, { type Table } from "dexie";
import type { HorizonPoint, HorizonSession } from "../types";

export class HorizonDatabase extends Dexie {
  sessions!: Table<HorizonSession>;
  points!: Table<HorizonPoint>;

  constructor() {
    super("HorizonCapture");
    this.version(1).stores({
      sessions: "id, startTime, endTime, locationName, totalPoints",
      points: "id, sessionId, azimuth, altitude, timestamp, accuracy",
    });
  }
}

export const db = new HorizonDatabase();

// Session management
export const createSession = async (
  locationName?: string,
  latitude?: number,
  longitude?: number
): Promise<string> => {
  const session: HorizonSession = {
    id: crypto.randomUUID(),
    startTime: new Date(),
    locationName,
    latitude,
    longitude,
    totalPoints: 0,
  };

  await db.sessions.add(session);
  return session.id;
};

export const endSession = async (sessionId: string): Promise<void> => {
  const pointCount = await db.points
    .where("sessionId")
    .equals(sessionId)
    .count();
  await db.sessions.update(sessionId, {
    endTime: new Date(),
    totalPoints: pointCount,
  });
};

export const getCurrentSession = async (): Promise<HorizonSession | null> => {
  const sessions = await db.sessions.where("endTime").equals("").toArray();

  return sessions.length > 0 ? sessions[0] : null;
};

// Point management
export const addPoint = async (
  sessionId: string,
  azimuth: number,
  altitude: number,
  accuracy: number,
  notes?: string
): Promise<string> => {
  const point: HorizonPoint = {
    id: crypto.randomUUID(),
    sessionId,
    azimuth,
    altitude,
    timestamp: new Date(),
    accuracy,
    notes,
  };

  await db.points.add(point);
  return point.id;
};

export const getPointsBySession = async (
  sessionId: string
): Promise<HorizonPoint[]> => {
  return await db.points.where("sessionId").equals(sessionId).toArray();
};

export const getAllPoints = async (): Promise<HorizonPoint[]> => {
  return await db.points.toArray();
};

export const updatePoint = async (
  pointId: string,
  updates: Partial<HorizonPoint>
): Promise<void> => {
  await db.points.update(pointId, updates);
};

export const deletePoint = async (pointId: string): Promise<void> => {
  await db.points.delete(pointId);
};

// Session queries
export const getAllSessions = async (): Promise<HorizonSession[]> => {
  return await db.sessions.orderBy("startTime").reverse().toArray();
};

export const getSessionById = async (
  sessionId: string
): Promise<HorizonSession | undefined> => {
  return await db.sessions.get(sessionId);
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  await db.points.where("sessionId").equals(sessionId).delete();
  await db.sessions.delete(sessionId);
};

// Utility functions
export const getCoverageStats = async (
  sessionId: string
): Promise<{
  totalPoints: number;
  azimuthRange: number;
  minAzimuth: number;
  maxAzimuth: number;
  avgAltitude: number;
  gaps: Array<{ start: number; end: number; size: number }>;
}> => {
  const points = await getPointsBySession(sessionId);

  if (points.length === 0) {
    return {
      totalPoints: 0,
      azimuthRange: 0,
      minAzimuth: 0,
      maxAzimuth: 0,
      avgAltitude: 0,
      gaps: [],
    };
  }

  const azimuths = points.map((p) => p.azimuth).sort((a, b) => a - b);
  const minAzimuth = Math.min(...azimuths);
  const maxAzimuth = Math.max(...azimuths);
  const azimuthRange = maxAzimuth - minAzimuth;
  const avgAltitude =
    points.reduce((sum, p) => sum + p.altitude, 0) / points.length;

  // Find gaps in coverage
  const gaps: Array<{ start: number; end: number; size: number }> = [];
  for (let i = 1; i < azimuths.length; i++) {
    const gap = azimuths[i] - azimuths[i - 1];
    if (gap > 15) {
      // Gap larger than 15 degrees
      gaps.push({
        start: azimuths[i - 1],
        end: azimuths[i],
        size: gap,
      });
    }
  }

  // Check wrap-around gap (between last and first point)
  const wrapGap = 360 - azimuths[azimuths.length - 1] + azimuths[0];
  if (wrapGap > 15) {
    gaps.push({
      start: azimuths[azimuths.length - 1],
      end: azimuths[0],
      size: wrapGap,
    });
  }

  return {
    totalPoints: points.length,
    azimuthRange,
    minAzimuth,
    maxAzimuth,
    avgAltitude,
    gaps,
  };
};

export const exportToCSV = async (
  sessionId: string,
  delimiter: "," | ";" = ","
): Promise<string> => {
  const points = await getPointsBySession(sessionId);

  if (points.length === 0) {
    throw new Error("No hay puntos para exportar");
  }

  // Sort by azimuth for N.I.N.A. compatibility
  const sortedPoints = points.sort((a, b) => a.azimuth - b.azimuth);

  // Create CSV content
  const headers = ["Azimuth", "Altitude"];
  const rows = sortedPoints.map((point) => [
    point.azimuth.toFixed(1),
    Math.max(0, point.altitude).toFixed(1), // Ensure non-negative altitude
  ]);

  const csvContent = [
    headers.join(delimiter),
    ...rows.map((row) => row.join(delimiter)),
  ].join("\n");

  return csvContent;
};

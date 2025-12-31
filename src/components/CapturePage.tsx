import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  CameraOff,
  Target,
  Settings,
  List,
  Share2,
} from "lucide-react";
import { sensorService } from "../services/sensors";
import { cameraService } from "../services/camera";
import {
  db,
  createSession,
  addPoint,
  getCurrentSession,
} from "../services/database";
import type { SensorReading, AccuracyLevel } from "../types";

const CapturePage: React.FC<{
  onNavigate?: (page: "capture" | "points" | "export" | "settings") => void;
}> = ({ onNavigate }) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentReading, setCurrentReading] = useState<SensorReading | null>(
    null
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pointCount, setPointCount] = useState(0);
  const [accuracyLevel, setAccuracyLevel] = useState<AccuracyLevel>("poor");
  const [isStable, setIsStable] = useState(false);
  // const [stabilityScore, setStabilityScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeServices();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (sessionId) {
      updatePointCount();
    }
  }, [sessionId]);

  const initializeServices = async () => {
    try {
      // Check permissions first
      const sensorStatus = await sensorService.checkPermissions();
      const cameraStatus = await cameraService.checkCapabilities();

      console.log("Sensor status:", sensorStatus);
      console.log("Camera capabilities:", cameraStatus);

      // Permissions: solicitar bajo gesto de usuario (al activar cámara)

      // Start sensor listening
      sensorService.startListening((reading) => {
        setCurrentReading(reading);
        const level = sensorService.getAccuracyLevel(reading.accuracy);
        setAccuracyLevel(level);
        setIsStable(sensorService.isDeviceStable());
        // setStabilityScore(sensorService.getStabilityScore());
      });

      // Create or get current session
      const currentSession = await getCurrentSession();
      if (currentSession) {
        setSessionId(currentSession.id);
      } else {
        const newSessionId = await createSession();
        setSessionId(newSessionId);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error initializing services"
      );
      console.error("Initialization error:", err);
    }
  };

  const cleanup = () => {
    sensorService.stopListening();
    if (isCameraActive) {
      cameraService.stopCamera();
    }
  };

  const updatePointCount = async () => {
    if (sessionId) {
      const points = await db.points
        .where("sessionId")
        .equals(sessionId)
        .toArray();
      setPointCount(points.length);
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      // Solicitar permisos de sensores bajo gesto de usuario
      await sensorService.requestPermissions();
      const stream = await cameraService.startCamera(true); // Prefer back camera
      setIsCameraActive(true);

      if (videoRef.current) {
        await cameraService.attachTo(videoRef.current);
        // Si el vídeo no muestra imagen, probar cámara opuesta
        setTimeout(async () => {
          const v = videoRef.current!;
          if (
            (v.videoWidth === 0 || v.readyState < 2) &&
            cameraService.getCurrentStream()
          ) {
            try {
              const alt = await cameraService.switchCamera();
              await cameraService.attachTo(v);
            } catch (e) {
              console.warn("Switch camera failed:", e);
            }
          }
        }, 800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error starting camera");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    cameraService.stopCamera();
    setIsCameraActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePoint = async () => {
    if (!currentReading || !sessionId) {
      return;
    }

    try {
      setIsCapturing(true);

      await addPoint(
        sessionId,
        currentReading.azimuth,
        currentReading.altitude,
        currentReading.accuracy
      );

      setPointCount((prev) => prev + 1);

      // Visual feedback
      setTimeout(() => setIsCapturing(false), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error capturing point");
      setIsCapturing(false);
    }
  };

  const getAccuracyColor = (level: AccuracyLevel): string => {
    switch (level) {
      case "excellent":
        return "text-green-400";
      case "good":
        return "text-yellow-400";
      case "fair":
        return "text-orange-400";
      case "poor":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getAccuracyText = (level: AccuracyLevel): string => {
    switch (level) {
      case "excellent":
        return "Excelente";
      case "good":
        return "Buena";
      case "fair":
        return "Regular";
      case "poor":
        return "Pobre";
      default:
        return "Desconocida";
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-space-950">
        <div className="text-center p-8">
          <div className="text-red-400 text-lg mb-4">Error</div>
          <div className="text-gray-300 mb-6">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="nav-button">
            Recargar Aplicación
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-space-950 flex flex-col">
      {/* Top HUD bar */}
      <div className="w-full flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-4">
          <div className="hud-element">
            <div className="sensor-label">Precisión</div>
            <div
              className={`sensor-reading ${getAccuracyColor(accuracyLevel)}`}>
              {getAccuracyText(accuracyLevel)}
            </div>
          </div>
          <div className="hud-element">
            <div className="sensor-label">Lectura</div>
            <div
              className={`sensor-reading ${
                currentReading ? "text-green-400" : "text-red-400"
              }`}>
              {currentReading ? "OK" : "Sin datos"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isCameraActive && (
            <button onClick={stopCamera} className="nav-button">
              <CameraOff className="w-5 h-5" />
              Apagar
            </button>
          )}
          <button
            onClick={() => onNavigate?.("settings")}
            className="nav-button">
            <Settings className="w-5 h-5" />
            Ajustes
          </button>
        </div>
      </div>

      {/* Main content: grid layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4">
        {/* Video area with overlay layers via grid cell */}
        <div className="col-span-9 grid rounded-lg overflow-hidden bg-black">
          <div className="row-start-1 col-start-1">
            {isCameraActive ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-space-900">
                <div className="text-center space-y-3">
                  <CameraOff className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-300">Cámara desactivada</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={startCamera} className="nav-button">
                      <Camera className="w-5 h-5" />
                      Activar Cámara
                    </button>
                    <button
                      onClick={() => sensorService.requestPermissions()}
                      className="nav-button">
                      Activar Sensores
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Overlay crosshair */}
          <div className="row-start-1 col-start-1 overlay-crosshair" />
          {/* Gradient overlay */}
          <div className="row-start-1 col-start-1 camera-gradient" />
        </div>

        {/* Side stats */}
        <div className="col-span-3 flex flex-col gap-4">
          <div className="hud-element">
            <div className="sensor-label">Azimut</div>
            <div className="sensor-reading">
              {currentReading
                ? `${currentReading.azimuth.toFixed(1)}°`
                : "---°"}
            </div>
          </div>
          <div className="hud-element">
            <div className="sensor-label">Altitud</div>
            <div className="sensor-reading">
              {currentReading
                ? `${currentReading.altitude.toFixed(1)}°`
                : "---°"}
            </div>
          </div>
          <div className="hud-element">
            <div className="sensor-label">Puntos</div>
            <div className="sensor-reading">{pointCount}</div>
          </div>
          <div className="hud-element">
            <div className="sensor-label">Estado</div>
            <div
              className={`sensor-reading ${
                isCapturing ? "text-blue-400" : "text-green-400"
              }`}>
              {isCapturing ? "Capturando..." : "Listo"}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom capture */}
      <div className="safe-bottom p-4">
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <button
              onClick={capturePoint}
              disabled={!currentReading || isCapturing}
              className={`capture-button ${isCapturing ? "recording" : ""}`}>
              <Target className="w-8 h-8 text-white" />
            </button>
            <div className="text-xs text-gray-400 mt-2 text-center">
              {!currentReading && "Activa sensores/cámara"}
              {currentReading && !isCapturing && "Capturar punto"}
              {isCapturing && "Capturando..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapturePage;

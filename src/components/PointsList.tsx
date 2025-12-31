import React, { useState, useEffect } from 'react';
import { Trash2, Edit3, Check, X, AlertCircle } from 'lucide-react';
import { getCurrentSession, getPointsBySession, updatePoint, deletePoint, getCoverageStats } from '../services/database';
import type { HorizonPoint } from '../types';

const PointsList: React.FC = () => {
  const [points, setPoints] = useState<HorizonPoint[]>([]);
  // const [sessionId, setSessionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ azimuth: '', altitude: '', notes: '' });
  const [coverageStats, setCoverageStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPoints();
  }, []);

  const loadPoints = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentSession = await getCurrentSession();
      if (!currentSession) {
        setError('No hay sesión activa');
        setLoading(false);
        return;
      }
      
      // setSessionId(currentSession.id);
      const sessionPoints = await getPointsBySession(currentSession.id);
      setPoints(sessionPoints);
      
      const stats = await getCoverageStats(currentSession.id);
      setCoverageStats(stats);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading points');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (point: HorizonPoint) => {
    setEditingId(point.id);
    setEditValues({
      azimuth: point.azimuth.toFixed(1),
      altitude: point.altitude.toFixed(1),
      notes: point.notes || ''
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    try {
      const azimuth = parseFloat(editValues.azimuth);
      const altitude = parseFloat(editValues.altitude);
      
      if (isNaN(azimuth) || isNaN(altitude)) {
        setError('Valores numéricos inválidos');
        return;
      }
      
      if (azimuth < 0 || azimuth > 360) {
        setError('Azimut debe estar entre 0 y 360 grados');
        return;
      }
      
      if (altitude < -90 || altitude > 90) {
        setError('Altitud debe estar entre -90 y 90 grados');
        return;
      }
      
      await updatePoint(editingId, {
        azimuth,
        altitude,
        notes: editValues.notes.trim() || undefined
      });
      
      setEditingId(null);
      await loadPoints();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving edit');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ azimuth: '', altitude: '', notes: '' });
  };

  const deletePointHandler = async (pointId: string) => {
    if (!confirm('¿Eliminar este punto?')) return;
    
    try {
      await deletePoint(pointId);
      await loadPoints();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting point');
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy <= 1.0) return 'text-green-400';
    if (accuracy <= 3.0) return 'text-yellow-400';
    if (accuracy <= 5.0) return 'text-orange-400';
    return 'text-red-400';
  };

  const getCoverageWarning = (): string | null => {
    if (!coverageStats) return null;
    
    if (coverageStats.gaps.length > 0) {
      const largestGap = Math.max(...coverageStats.gaps.map((g: any) => g.size));
      return `¡Hay huecos de hasta ${largestGap.toFixed(1)}° en la cobertura!`;
    }
    
    if (coverageStats.totalPoints < 12) {
      return 'Se recomiendan al menos 12 puntos para una buena cobertura.';
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-space-950">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error && points.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-space-950">
        <div className="text-center p-8">
          <div className="text-red-400 text-lg mb-4">Error</div>
          <div className="text-gray-300 mb-6">{error}</div>
          <button
            onClick={loadPoints}
            className="nav-button"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const coverageWarning = getCoverageWarning();

  return (
    <div className="h-full bg-space-950 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-space-900 border-b border-space-700 p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-white">Puntos Capturados</h1>
            <div className="text-sm text-gray-400">
              Total: {points.length} puntos
            </div>
          </div>
          
          {coverageStats && (
            <div className="mt-2 text-sm text-gray-300">
              <div>Cobertura: {coverageStats.azimuthRange.toFixed(1)}°</div>
              <div>Altitud media: {coverageStats.avgAltitude.toFixed(1)}°</div>
            </div>
          )}
          
          {coverageWarning && (
            <div className="mt-2 flex items-center text-yellow-400">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">{coverageWarning}</span>
            </div>
          )}
        </div>

        {/* Points List */}
        <div className="flex-1 overflow-y-auto p-4">
          {points.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-4">No hay puntos capturados</div>
              <div className="text-gray-500 text-sm">
                Ve a la página de captura para comenzar
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {points.map((point) => (
                <div key={point.id} className="point-item">
                  {editingId === point.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Azimut (°)</label>
                          <input
                            type="number"
                            value={editValues.azimuth}
                            onChange={(e) => setEditValues(prev => ({ ...prev, azimuth: e.target.value }))}
                            className="form-input w-full"
                            min="0"
                            max="360"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Altitud (°)</label>
                          <input
                            type="number"
                            value={editValues.altitude}
                            onChange={(e) => setEditValues(prev => ({ ...prev, altitude: e.target.value }))}
                            className="form-input w-full"
                            min="-90"
                            max="90"
                            step="0.1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Notas</label>
                        <input
                          type="text"
                          value={editValues.notes}
                          onChange={(e) => setEditValues(prev => ({ ...prev, notes: e.target.value }))}
                          className="form-input w-full"
                          placeholder="Notas opcionales..."
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={saveEdit}
                          className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Guardar
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <div>
                            <div className="text-xs text-gray-400">Azimut</div>
                            <div className="text-lg font-mono text-white">{point.azimuth.toFixed(1)}°</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Altitud</div>
                            <div className="text-lg font-mono text-white">{point.altitude.toFixed(1)}°</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Precisión</div>
                            <div className={`text-sm font-mono ${getAccuracyColor(point.accuracy)}`}>
                              ±{point.accuracy.toFixed(1)}°
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(point.timestamp)}
                        </div>
                        {point.notes && (
                          <div className="text-sm text-gray-300 mt-2 italic">
                            "{point.notes}"
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => startEdit(point)}
                          className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePointHandler(point.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 m-4 rounded">
            <div className="flex">
              <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-space-900 border-t border-space-700 p-4">
          <div className="flex justify-between items-center">
            <button
              onClick={loadPoints}
              className="nav-button"
            >
              Actualizar
            </button>
            <div className="text-sm text-gray-400">
              Última actualización: {new Date().toLocaleTimeString('es-ES')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointsList;
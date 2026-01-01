import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { HorizonData, HorizonPoint } from '../types';

export const useHorizonData = () => {
  const [horizons, setHorizons] = useState<HorizonData[]>([]);
  const [currentHorizon, setCurrentHorizon] = useState<HorizonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHorizons = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await storageService.getHorizons();
      setHorizons(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load horizons');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createNewHorizon = useCallback((name: string) => {
    const newHorizon: HorizonData = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      points: [],
      metadata: {
        deviceModel: 'Unknown',
        appVersion: '1.0.0',
        sensorAccuracy: 0,
      },
    };
    setCurrentHorizon(newHorizon);
    return newHorizon;
  }, []);

  const addPointToCurrentHorizon = useCallback((point: HorizonPoint) => {
    if (!currentHorizon) return;

    const updatedHorizon = {
      ...currentHorizon,
      points: [...currentHorizon.points, point],
    };
    setCurrentHorizon(updatedHorizon);
  }, [currentHorizon]);

  const saveCurrentHorizon = useCallback(async () => {
    if (!currentHorizon || currentHorizon.points.length === 0) {
      throw new Error('No horizon data to save');
    }

    try {
      setError(null);
      await storageService.saveHorizon(currentHorizon);
      await loadHorizons(); // Reload horizons list
      setCurrentHorizon(null); // Clear current horizon
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save horizon');
      throw err;
    }
  }, [currentHorizon, loadHorizons]);

  const updateHorizon = useCallback(async (id: string, updates: Partial<HorizonData>) => {
    try {
      setError(null);
      await storageService.updateHorizon(id, updates);
      await loadHorizons();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update horizon');
      throw err;
    }
  }, [loadHorizons]);

  const deleteHorizon = useCallback(async (id: string) => {
    try {
      setError(null);
      await storageService.deleteHorizon(id);
      await loadHorizons();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete horizon');
      throw err;
    }
  }, [loadHorizons]);

  const getHorizonById = useCallback(async (id: string): Promise<HorizonData | null> => {
    try {
      return await storageService.getHorizonById(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get horizon');
      return null;
    }
  }, []);

  const clearCurrentHorizon = useCallback(() => {
    setCurrentHorizon(null);
  }, []);

  const getCoveragePercentage = useCallback((horizon: HorizonData): number => {
    if (horizon.points.length === 0) return 0;
    
    const uniqueAzimuths = new Set(horizon.points.map(p => Math.round(p.azimuth / 5) * 5));
    return (uniqueAzimuths.size / 72) * 100; // 72 points for 5-degree resolution
  }, []);

  const isHorizonComplete = useCallback((horizon: HorizonData): boolean => {
    return getCoveragePercentage(horizon) >= 80; // At least 80% coverage
  }, [getCoveragePercentage]);

  useEffect(() => {
    loadHorizons();
  }, [loadHorizons]);

  return {
    horizons,
    currentHorizon,
    isLoading,
    error,
    loadHorizons,
    createNewHorizon,
    addPointToCurrentHorizon,
    saveCurrentHorizon,
    updateHorizon,
    deleteHorizon,
    getHorizonById,
    clearCurrentHorizon,
    getCoveragePercentage,
    isHorizonComplete,
  };
};
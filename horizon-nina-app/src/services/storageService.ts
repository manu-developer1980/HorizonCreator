import AsyncStorage from '@react-native-async-storage/async-storage';
import { HorizonData } from '../types';
import { STORAGE_KEYS } from '../constants';

class StorageService {
  async saveHorizon(horizon: HorizonData): Promise<void> {
    try {
      const existingHorizons = await this.getHorizons();
      const updatedHorizons = [...existingHorizons, horizon];
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.HORIZONS,
        JSON.stringify(updatedHorizons)
      );
    } catch (error) {
      console.error('Error saving horizon:', error);
      throw new Error('Failed to save horizon data');
    }
  }

  async getHorizons(): Promise<HorizonData[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HORIZONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting horizons:', error);
      return [];
    }
  }

  async getHorizonById(id: string): Promise<HorizonData | null> {
    try {
      const horizons = await this.getHorizons();
      return horizons.find(h => h.id === id) || null;
    } catch (error) {
      console.error('Error getting horizon by ID:', error);
      return null;
    }
  }

  async updateHorizon(id: string, updates: Partial<HorizonData>): Promise<void> {
    try {
      const horizons = await this.getHorizons();
      const index = horizons.findIndex(h => h.id === id);
      
      if (index === -1) {
        throw new Error('Horizon not found');
      }
      
      horizons[index] = { ...horizons[index], ...updates };
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.HORIZONS,
        JSON.stringify(horizons)
      );
    } catch (error) {
      console.error('Error updating horizon:', error);
      throw new Error('Failed to update horizon data');
    }
  }

  async deleteHorizon(id: string): Promise<void> {
    try {
      const horizons = await this.getHorizons();
      const filteredHorizons = horizons.filter(h => h.id !== id);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.HORIZONS,
        JSON.stringify(filteredHorizons)
      );
    } catch (error) {
      console.error('Error deleting horizon:', error);
      throw new Error('Failed to delete horizon data');
    }
  }

  async saveSettings(settings: any): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  async getSettings(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting settings:', error);
      return {};
    }
  }

  async saveLastLocation(location: { latitude: number; longitude: number; altitude?: number }): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_LOCATION,
        JSON.stringify(location)
      );
    } catch (error) {
      console.error('Error saving location:', error);
      throw new Error('Failed to save location');
    }
  }

  async getLastLocation(): Promise<{ latitude: number; longitude: number; altitude?: number } | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_LOCATION);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error('Failed to clear all data');
    }
  }

  async exportAllData(): Promise<string> {
    try {
      const horizons = await this.getHorizons();
      const settings = await this.getSettings();
      const location = await this.getLastLocation();
      
      const exportData = {
        horizons,
        settings,
        location,
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }
}

export const storageService = new StorageService();
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { useDeviceMotion } from '../hooks/useDeviceMotion';
import { useHorizonData } from '../hooks/useHorizonData';
import { SensorDisplay } from '../components/capture/SensorDisplay';
import { CameraViewfinder } from '../components/capture/CameraViewfinder';
import { CaptureButton } from '../components/capture/CaptureButton';
import { ProgressIndicator } from '../components/capture/ProgressIndicator';
import { processDeviceMotionData } from '../utils/calculations';
import { HorizonPoint } from '../types';

export const CaptureScreen: React.FC = () => {
  const { motionData, isListening, accuracy, startListening, stopListening, calibrate } = useDeviceMotion();
  const { currentHorizon, addPointToCurrentHorizon, createNewHorizon, saveCurrentHorizon, isHorizonComplete } = useHorizonData();
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [horizonName, setHorizonName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  useEffect(() => {
    startListening();
    return () => {
      stopListening();
    };
  }, []);

  const handleStartCapture = () => {
    if (!motionData || accuracy.overall < 0.6) {
      Alert.alert(
        'Low Sensor Accuracy',
        'Please calibrate sensors or improve device positioning for better accuracy.',
        [{ text: 'OK' }]
      );
      return;
    }

    setShowNameInput(true);
  };

  const handleCreateHorizon = (name: string) => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a valid name for the horizon.');
      return;
    }

    createNewHorizon(name.trim());
    setHorizonName(name.trim());
    setShowNameInput(false);
    setIsCapturing(true);
  };

  const handleCapturePoint = async () => {
    if (!motionData || !currentHorizon) return;

    try {
      const processedPoints = processDeviceMotionData([motionData]);
      if (processedPoints.length > 0) {
        const point: HorizonPoint = {
          ...processedPoints[0],
          timestamp: Date.now(),
        };
        addPointToCurrentHorizon(point);
      }
    } catch (error) {
      console.error('Error capturing point:', error);
      Alert.alert('Error', 'Failed to capture point. Please try again.');
    }
  };

  const handleStopCapture = () => {
    if (!currentHorizon || currentHorizon.points.length === 0) {
      setIsCapturing(false);
      return;
    }

    const coverage = (currentHorizon.points.length / 72) * 100; // Assuming 5-degree resolution
    
    if (coverage < 50) {
      Alert.alert(
        'Low Coverage',
        `You have captured ${currentHorizon.points.length} points (${coverage.toFixed(1)}% coverage). Continue capturing for better results?`,
        [
          { text: 'Continue', onPress: () => {} },
          { text: 'Save Anyway', onPress: handleSaveHorizon },
          { text: 'Cancel', onPress: () => setIsCapturing(false), style: 'cancel' },
        ]
      );
    } else {
      handleSaveHorizon();
    }
  };

  const handleSaveHorizon = async () => {
    try {
      await saveCurrentHorizon();
      setIsCapturing(false);
      setHorizonName('');
      Alert.alert('Success', 'Horizon saved successfully!');
    } catch (error) {
      console.error('Error saving horizon:', error);
      Alert.alert('Error', 'Failed to save horizon. Please try again.');
    }
  };

  const handleCalibrate = async () => {
    try {
      const result = await calibrate();
      if (result.success) {
        Alert.alert('Calibration Complete', 'Sensors calibrated successfully!');
      } else {
        Alert.alert('Calibration Warning', result.message || 'Low accuracy detected. Please try again.');
      }
    } catch (error) {
      console.error('Error calibrating:', error);
      Alert.alert('Error', 'Failed to calibrate sensors.');
    }
  };

  const coverage = currentHorizon ? (currentHorizon.points.length / 72) * 100 : 0;
  const isComplete = currentHorizon ? isHorizonComplete(currentHorizon) : false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Horizon Capture</Text>
        <Text style={styles.subtitle}>
          {isCapturing ? `Capturing: ${horizonName}` : 'Ready to capture'}
        </Text>
      </View>

      <CameraViewfinder />
      <SensorDisplay motionData={motionData} accuracy={accuracy} />

      {currentHorizon && (
        <ProgressIndicator
          points={currentHorizon.points.length}
          coverage={coverage}
          isComplete={isComplete}
        />
      )}

      <View style={styles.buttonContainer}>
        {!isCapturing ? (
          <>
            <CaptureButton
              onPress={handleStartCapture}
              disabled={!isListening || accuracy.overall < 0.6}
              accuracy={accuracy.overall}
            />
            <Text style={styles.buttonLabel}>Start New Horizon</Text>
          </>
        ) : (
          <>
            <CaptureButton
              onPress={handleCapturePoint}
              disabled={!motionData || accuracy.overall < 0.6}
              accuracy={accuracy.overall}
            />
            <Text style={styles.buttonLabel}>Capture Point</Text>
          </>
        )}
      </View>

      {isCapturing && (
        <View style={styles.controlButtons}>
          <Text style={styles.stopButton} onPress={handleStopCapture}>
            Stop & Save
          </Text>
        </View>
      )}

      <View style={styles.calibrationSection}>
        <Text style={styles.calibrationText} onPress={handleCalibrate}>
          Calibrate Sensors
        </Text>
      </View>

      {showNameInput && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Name Your Horizon</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter horizon name"
              value={horizonName}
              onChangeText={setHorizonName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Text style={styles.modalButton} onPress={() => setShowNameInput(false)}>
                Cancel
              </Text>
              <Text 
                style={[styles.modalButton, styles.modalButtonPrimary]} 
                onPress={() => handleCreateHorizon(horizonName)}
              >
                Create
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  buttonContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  controlButtons: {
    alignItems: 'center',
    marginTop: 16,
  },
  stopButton: {
    fontSize: 16,
    color: '#f44336',
    fontWeight: '600',
    padding: 12,
  },
  calibrationSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  calibrationText: {
    fontSize: 14,
    color: '#2196f3',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    fontSize: 16,
    color: '#666',
    padding: 12,
  },
  modalButtonPrimary: {
    color: '#2196f3',
    fontWeight: '600',
  },
});

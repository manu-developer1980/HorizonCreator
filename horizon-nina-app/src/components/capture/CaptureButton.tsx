import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface CaptureButtonProps {
  onPress: () => void;
  disabled?: boolean;
  isCapturing?: boolean;
  accuracy?: number;
}

export const CaptureButton: React.FC<CaptureButtonProps> = ({
  onPress,
  disabled = false,
  isCapturing = false,
  accuracy = 0,
}) => {
  const getButtonStyle = () => {
    if (disabled) return styles.buttonDisabled;
    if (accuracy >= 0.8) return styles.buttonGood;
    if (accuracy >= 0.6) return styles.buttonMedium;
    return styles.buttonPoor;
  };

  const getButtonText = () => {
    if (isCapturing) return 'Capturing...';
    if (accuracy < 0.6) return 'Low Accuracy';
    return 'Capture Point';
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle()]}
      onPress={onPress}
      disabled={disabled || isCapturing || accuracy < 0.6}
    >
      {isCapturing ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.buttonText}>{getButtonText()}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGood: {
    backgroundColor: '#4caf50',
  },
  buttonMedium: {
    backgroundColor: '#ff9800',
  },
  buttonPoor: {
    backgroundColor: '#f44336',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
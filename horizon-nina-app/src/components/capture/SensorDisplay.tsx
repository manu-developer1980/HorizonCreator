import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DeviceMotionData, SensorAccuracy } from "../../types";
import {
  normalizeAzimuth,
  computeAltitudeFromBeta,
} from "../../utils/calculations";
import { DECLINATION_DEG } from "../../constants";

interface SensorDisplayProps {
  motionData: DeviceMotionData | null;
  accuracy: SensorAccuracy;
}

export const SensorDisplay: React.FC<SensorDisplayProps> = ({
  motionData,
  accuracy,
}) => {
  if (!motionData) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No sensor data available</Text>
      </View>
    );
  }

  const { rotation } = motionData;
  const az = normalizeAzimuth(rotation.alpha, DECLINATION_DEG);
  const alt = computeAltitudeFromBeta(rotation.beta);

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Orientation</Text>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Azimuth:</Text>
          <Text style={styles.value}>{az.toFixed(0)}°</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Altitude:</Text>
          <Text style={styles.value}>{alt.toFixed(1)}°</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sensor Quality</Text>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Overall:</Text>
          <Text style={[styles.value, getAccuracyStyle(accuracy.overall)]}>
            {(accuracy.overall * 100).toFixed(0)}%
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Motion:</Text>
          <Text style={[styles.value, getAccuracyStyle(accuracy.motion)]}>
            {(accuracy.motion * 100).toFixed(0)}%
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Orientation:</Text>
          <Text style={[styles.value, getAccuracyStyle(accuracy.orientation)]}>
            {(accuracy.orientation * 100).toFixed(0)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

const getAccuracyStyle = (accuracy: number) => {
  if (accuracy >= 0.8) return styles.accuracyGood;
  if (accuracy >= 0.6) return styles.accuracyMedium;
  return styles.accuracyPoor;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
    paddingVertical: 2,
  },
  label: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  value: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    minWidth: 80,
    textAlign: "right",
  },
  accuracyGood: {
    color: "#4caf50",
  },
  accuracyMedium: {
    color: "#ff9800",
  },
  accuracyPoor: {
    color: "#f44336",
  },
  noDataText: {
    textAlign: "center",
    color: "#999",
    fontSize: 16,
    padding: 20,
  },
});

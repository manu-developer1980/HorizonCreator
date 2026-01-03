import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useHorizonData } from "../hooks/useHorizonData";
import { calculateStatistics } from "../utils/calculations";
import { exportService } from "../services/exportService";

export const ListScreen: React.FC = () => {
  const { horizons, loadHorizons, deleteHorizon } = useHorizonData();
  const [exportingId, setExportingId] = React.useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadHorizons();
    }, [loadHorizons])
  );

  const handleExport = async (item: any) => {
    try {
      setExportingId(item.id);
      const path = await exportService.generateHznFile(item, {
        resolution: 5,
        format: "standard",
        includeMetadata: true,
        interpolateGaps: true,
      });
      await exportService.shareFile(path);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to export file. Please try again.");
    } finally {
      setExportingId(null);
    }
  };

  const renderItem = ({ item }: any) => {
    const stats = calculateStatistics(item.points);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Points</Text>
          <Text style={styles.value}>{item.points.length}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Coverage</Text>
          <Text style={styles.value}>{stats.coverage}%</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primary,
              exportingId === item.id && styles.disabled,
            ]}
            disabled={exportingId === item.id}
            onPress={() => handleExport(item)}>
            <Text style={styles.buttonText}>
              {exportingId === item.id ? "Exporting..." : "Export .hzn"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.danger]}
            onPress={() => deleteHorizon(item.id)}>
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {horizons.length === 0 ? (
        <Text style={styles.empty}>No horizons yet</Text>
      ) : (
        <FlatList
          data={horizons}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  empty: { textAlign: "center", marginTop: 40, color: "#666" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: { marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  cardSubtitle: { fontSize: 12, color: "#888" },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  label: { color: "#666" },
  value: { color: "#333", fontWeight: "600" },
  actions: { flexDirection: "row", gap: 12, marginTop: 12 },
  button: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  primary: { backgroundColor: "#1a237e" },
  danger: { backgroundColor: "#f44336" },
  disabled: { backgroundColor: "#9fa8da" },
  buttonText: { color: "#fff", fontWeight: "600" },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressIndicatorProps {
  points: number;
  coverage: number;
  isComplete: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  points,
  coverage,
  isComplete,
}) => {
  const getProgressColor = () => {
    if (isComplete) return '#4caf50';
    if (coverage >= 60) return '#ff9800';
    return '#f44336';
  };

  const getProgressText = () => {
    if (isComplete) return 'Complete!';
    if (coverage >= 60) return 'Almost there';
    return 'Keep capturing';
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{points}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: getProgressColor() }]}>
            {coverage.toFixed(1)}%
          </Text>
          <Text style={styles.statLabel}>Coverage</Text>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${Math.min(coverage, 100)}%`, backgroundColor: getProgressColor() }]} />
      </View>
      
      <Text style={[styles.progressText, { color: getProgressColor() }]}>
        {getProgressText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
});
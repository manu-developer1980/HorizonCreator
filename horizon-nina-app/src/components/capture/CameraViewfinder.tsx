import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export const CameraViewfinder: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    if (!permission || !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission || !permission.granted) {
    return (
      <View style={styles.permissionBox}>
        <Text style={styles.permissionText}>Camera permission required to show viewfinder</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={(r) => (cameraRef.current = r)}
        style={styles.camera}
        onCameraReady={() => setReady(true)}
      />
      <View style={styles.overlayCenter}>
        <View style={styles.reticle} />
      </View>
      <View style={styles.overlayHorizon}>
        <View style={styles.horizonLine} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#000'
  },
  camera: {
    flex: 1,
  },
  overlayCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)'
  },
  overlayHorizon: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '30%'
  },
  horizonLine: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.8)'
  },
  permissionBox: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center'
  },
  permissionText: {
    color: '#fff',
    fontSize: 14
  }
});

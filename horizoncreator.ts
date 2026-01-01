import { useEffect, useRef, useState } from "react";
import { Text, View, Button, StyleSheet, ScrollView } from "react-native";
import { DeviceMotion } from "expo-sensors";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const DECLINATION = 0; // <-- AJUSTA TU DECLINACIÓN MAGNÉTICA (en grados)

export default function App() {
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState({ az: 0, alt: 0 });
  const horizon = useRef<Record<number, number>>({});
  const azBuf = useRef<number[]>([]);
  const altBuf = useRef<number[]>([]);
  const bufSize = 12;

  useEffect(() => {
    DeviceMotion.setUpdateInterval(50);

    const sub = DeviceMotion.addListener(
      ({ rotation, accelerationIncludingGravity }) => {
        if (!rotation || !running) return;

        let az = ((rotation.yaw * 180) / Math.PI + 360) % 360;

        az = (az + DECLINATION + 360) % 360;

        let alt = (rotation.pitch * 180) / Math.PI;

        if (accelerationIncludingGravity) {
          const gx = accelerationIncludingGravity.x || 0;
          const gy = accelerationIncludingGravity.y || 0;
          const gz = accelerationIncludingGravity.z || 0;
          const mag = Math.sqrt(gx * gx + gy * gy + gz * gz);
          if (mag > 1e-6) {
            const ux = gx / mag;
            const uz = gz / mag;
            const dot = -uz;
            const clamped = Math.max(-1, Math.min(1, dot));
            const angle = Math.acos(clamped) * (180 / Math.PI);
            alt = Math.max(0, Math.min(90, 90 - angle));
          }
        }

        azBuf.current.push(az);
        altBuf.current.push(alt);
        if (azBuf.current.length > bufSize) azBuf.current.shift();
        if (altBuf.current.length > bufSize) altBuf.current.shift();

        const azAvg = circularMean(azBuf.current);
        const altAvg = arithmeticMean(altBuf.current);

        az = Math.round(azAvg);
        alt = Math.round(altAvg * 10) / 10;

        horizon.current[az] =
          horizon.current[az] === undefined
            ? alt
            : Math.min(horizon.current[az], alt);

        setCurrent({ az, alt });
      }
    );

    return () => sub.remove();
  }, [running]);

  const resetCapture = () => {
    setRunning(false);
    horizon.current = {};
    azBuf.current = [];
    altBuf.current = [];
    setCurrent({ az: 0, alt: 0 });
  };

  const exportHorizon = async () => {
    const series = buildCompleteHorizon(horizon.current);
    const lines = [
      "# Azimuth Altitude",
      ...series.map((alt, az) => `${az} ${alt}`),
    ];
    const content = lines.join("\n");
    const path = FileSystem.documentDirectory + "horizon_nina.hzn";
    await FileSystem.writeAsStringAsync(path, content);
    await Sharing.shareAsync(path);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NINA Horizon Generator</Text>

      <Text style={styles.value}>Azimut: {current.az}°</Text>
      <Text style={styles.value}>Altitud: {current.alt}°</Text>

      <View style={styles.buttons}>
        <Button
          title={running ? "Detener captura" : "Iniciar captura"}
          onPress={() => setRunning(!running)}
        />
        <Button title="Reiniciar" onPress={resetCapture} />
        <Button title="Exportar horizonte" onPress={exportHorizon} />
      </View>

      <ScrollView style={styles.log}>
        {Object.keys(horizon.current)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map((az) => (
            <Text key={az}>
              {az}° → {horizon.current[az]}°
            </Text>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 50,
    backgroundColor: "#0b0b0b",
  },
  title: {
    fontSize: 22,
    color: "#fff",
    marginBottom: 20,
    fontWeight: "bold",
  },
  value: {
    fontSize: 18,
    color: "#0f0",
    marginBottom: 6,
  },
  buttons: {
    marginVertical: 12,
    gap: 10,
  },
  log: {
    marginTop: 10,
  },
});

function arithmeticMean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function circularMean(degrees: number[]): number {
  if (!degrees.length) return 0;
  const degtorad = Math.PI / 180;
  let sumSin = 0;
  let sumCos = 0;
  for (const d of degrees) {
    const r = d * degtorad;
    sumSin += Math.sin(r);
    sumCos += Math.cos(r);
  }
  const mean = (Math.atan2(sumSin, sumCos) * 180) / Math.PI;
  return mean < 0 ? mean + 360 : mean;
}

function clampAltitude(v: number): number {
  if (!isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 90) return 90;
  return Math.round(v * 10) / 10;
}

function buildCompleteHorizon(map: Record<number, number>): number[] {
  const arr: number[] = new Array(360).fill(undefined as unknown as number);
  for (let az = 0; az < 360; az++) {
    const v = map[az];
    if (v !== undefined) arr[az] = clampAltitude(v);
  }
  let last = 0;
  for (let az = 0; az < 360; az++) {
    if (arr[az] === (undefined as unknown as number)) {
      arr[az] = last;
    } else {
      last = arr[az];
    }
  }
  if (arr[0] === (undefined as unknown as number)) arr[0] = 0;
  for (let az = 359; az >= 0; az--) {
    if (arr[az] === (undefined as unknown as number)) {
      arr[az] = arr[(az + 1) % 360];
    }
  }
  return arr.map(clampAltitude);
}

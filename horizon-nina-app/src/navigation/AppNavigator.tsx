import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from "react-native";
import { CaptureScreen } from "../screens/CaptureScreen";
import { ListScreen } from "../screens/ListScreen";

const Tab = createBottomTabNavigator();

// Placeholder screens for other tabs
// Settings placeholder remains

const SettingsScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.screenText}>Settings Screen</Text>
    <Text style={styles.screenSubtitle}>Coming soon...</Text>
  </View>
);

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: "#1a237e",
          tabBarInactiveTintColor: "#666",
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#e0e0e0",
            paddingBottom: 8,
            paddingTop: 8,
            height: 60,
          },
          headerStyle: {
            backgroundColor: "#1a237e",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}>
        <Tab.Screen
          name="Capture"
          component={CaptureScreen}
          options={{
            title: "Capture Horizon",
            tabBarLabel: "Capture",
            tabBarIcon: ({ color, size }) => (
              <View style={[styles.iconContainer, { backgroundColor: color }]}>
                <Text style={styles.iconText}>📍</Text>
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="List"
          component={ListScreen}
          options={{
            title: "My Horizons",
            tabBarLabel: "Horizons",
            tabBarIcon: ({ color, size }) => (
              <View style={[styles.iconContainer, { backgroundColor: color }]}>
                <Text style={styles.iconText}>📊</Text>
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: "Settings",
            tabBarLabel: "Settings",
            tabBarIcon: ({ color, size }) => (
              <View style={[styles.iconContainer, { backgroundColor: color }]}>
                <Text style={styles.iconText}>⚙️</Text>
              </View>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  screenText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 16,
    color: "#666",
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.8,
  },
  iconText: {
    fontSize: 12,
    color: "#fff",
  },
});

import React, { useEffect } from "react";
import { Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, type RouteProp } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AppProvider } from "./src/context/AppContext";
import { HomeScreen } from "./src/screens/HomeScreen";
import { TemplatesScreen } from "./src/screens/TemplatesScreen";
import { TripHistoryScreen } from "./src/screens/TripHistoryScreen";
import { CreateTripScreen } from "./src/screens/CreateTripScreen";
import { PackingListScreen } from "./src/screens/PackingListScreen";
import { registerForPushNotifications } from "./src/services/notificationService";
// Importing the location service registers the background geofencing task.
import "./src/services/locationService";
import type { RootStackParamList, TabParamList } from "./src/types";
import { colors } from "./src/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, string> = {
  Home: "🏠",
  Templates: "📋",
  History: "🕘",
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: focused ? 22 : 20 }}>
            {TAB_ICONS[route.name]}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Templates"
        component={TemplatesScreen}
        options={{ title: "Templates" }}
      />
      <Tab.Screen
        name="History"
        component={TripHistoryScreen}
        options={{ title: "History" }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    registerForPushNotifications().catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: colors.textInverse,
              headerTitleStyle: { fontWeight: "700" },
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen
              name="Tabs"
              component={Tabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateTrip"
              component={CreateTripScreen}
              options={{ title: "New Trip", presentation: "modal" }}
            />
            <Stack.Screen
              name="PackingList"
              component={PackingListScreen}
              options={({ route }: { route: RouteProp<RootStackParamList, "PackingList"> }) => ({
                title: route.params.tripName ?? "Packing List",
              })}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="light" />
      </AppProvider>
    </SafeAreaProvider>
  );
}

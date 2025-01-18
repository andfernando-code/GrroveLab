import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { FontAwesome } from '@expo/vector-icons';
import iconSet from "@expo/vector-icons/build/Fontisto";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "GrooveLab",
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Cards',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="home" size={24} color={color} />
          ),
        }}
      />
      {/* Add other tab screens as needed */}
    </Tabs>
  );
}

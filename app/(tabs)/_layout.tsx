import React from "react";
import { Tabs } from "expo-router";
import { FontAwesome } from "@expo/vector-icons"; // Import FontAwesome

const TabRoot = () => {
  return (
    <Tabs>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="home" color={color} size={30} />
          ),
        }}
      />

      <Tabs.Screen
        name="contact"
        options={{
          title: "Contact",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="envelope" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="cogs" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="pages/event"
        options={{ href: null, headerTitle: "Events" }}
      />
      <Tabs.Screen
        name="pages/profile"
        options={{ href: null, headerTitle: "Profile" }}
      />
      <Tabs.Screen
        name="pages/eventItem"
        options={{ headerTitle: "EventItem", href: null }}
      />
    </Tabs>
  );
};

export default TabRoot;

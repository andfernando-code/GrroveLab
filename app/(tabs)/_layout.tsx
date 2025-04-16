import React from "react";
import { Tabs } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { Colors } from "react-native/Libraries/NewAppScreen";

const TabRoot = () => {
  return (
    <Tabs screenOptions={{headerStyle:{backgroundColor: "#6C63FF"}, headerTintColor: "#fff"}}>
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color }) => (
            <FontAwesome name="home" color={color} size={30} />
          ),
          headerTitle: "Home",
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name= "mobile-phone" color={color} size={32} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="cogs" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="pages/event"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="pages/profile"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="pages/eventItem"
        options={{ href: null }}
      />
    </Tabs>
  );
};

export default TabRoot;
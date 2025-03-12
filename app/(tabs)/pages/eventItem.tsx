import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

const EventItem = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{params.name}</Text>
        <Text style={styles.date}>
          🗓 Date: {new Date(params.dateTime as string).toDateString()}
        </Text>
        <Text style={styles.date}>
          ⏰ Time: {new Date(params.dateTime as string).toLocaleTimeString()}
        </Text>
        {params.specialNotes ? (
          <Text style={styles.description}>📝 {params.specialNotes}</Text>
        ) : null}
      </View>

      <Pressable style={styles.backButton} onPress={() => router.push("/(tabs)/pages/event")}>
        <Text style={styles.backButtonText}>⬅ Back to Events</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  date: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#444",
  },
  backButton: {
    backgroundColor: "#6e0307",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EventItem;

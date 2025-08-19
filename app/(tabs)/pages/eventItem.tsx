import React from "react";
import { View, Text, StyleSheet, Pressable, StatusBar } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const EventItem = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Format date and time more professionally
  const eventDate = new Date(params.dateTime as string);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  
  const formattedTime = eventDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient 
        colors={['#6e0307', '#990f14']} 
        style={styles.header}
      >
        <Text style={styles.headerTitle}>{params.name}</Text>
      </LinearGradient>
      
      <View style={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.dateTimeContainer}>
            <View style={styles.iconTextContainer}>
              <Text style={styles.icon}>🗓</Text>
              <View>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.value}>{formattedDate}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.iconTextContainer}>
              <Text style={styles.icon}>⏰</Text>
              <View>
                <Text style={styles.label}>Time</Text>
                <Text style={styles.value}>{formattedTime}</Text>
              </View>
            </View>
          </View>
          
          {params.specialNotes ? (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Special Notes</Text>
              <View style={styles.notesContainer}>
                <Text style={styles.notesIcon}>📝</Text>
                <Text style={styles.notesText}>{params.specialNotes}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <Pressable 
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.buttonPressed
          ]} 
          onPress={() => router.push("/(tabs)/pages/event")}
        >
          <Text style={styles.backButtonText}>Back to Events</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 30,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dateTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  iconTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
    fontWeight: "500",
  },
  value: {
    fontSize: 16,
    color: "#212529",
    fontWeight: "600",
  },
  divider: {
    width: 1,
    backgroundColor: "#e9ecef",
    marginHorizontal: 15,
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    paddingTop: 20,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 12,
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  notesIcon: {
    fontSize: 20,
    marginRight: 10,
    paddingTop: 2,
  },
  notesText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: "#495057",
  },
  backButton: {
    backgroundColor: "#6e0307",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  buttonPressed: {
    backgroundColor: "#5a0206",
    transform: [{ scale: 0.98 }],
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EventItem;
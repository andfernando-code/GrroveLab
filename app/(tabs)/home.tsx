import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, StatusBar, ScrollView } from "react-native";
import styles from "../styles";
import React, { useEffect, useState } from "react";
import { Link } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const Home = () => {
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [bandName, setBandName] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem("userEmail");
        const storedBandName = await AsyncStorage.getItem("bandName");
        if (storedEmail && storedBandName) {
          setBandName(storedBandName);

          // Fetch band ID
          const bandQuery = query(
            collection(db, "bands"),
            where("bandName", "==", storedBandName)
          );
          const bandSnapshot = await getDocs(bandQuery);
          if (!bandSnapshot.empty) {
            const bandId = bandSnapshot.docs[0].id;

            // Fetch user details
            const usersQuery = query(
              collection(db, `bands/${bandId}/users`),
              where("email", "==", storedEmail)
            );
            const usersSnapshot = await getDocs(usersQuery);
            if (!usersSnapshot.empty) {
              const userData = usersSnapshot.docs[0].data();
              setUserName(userData.name);
              setUserRole(userData.role);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  return (
    <View style={localStyles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header with premium gradient */}
      <LinearGradient
        colors={["#3A2DBB", "#5046E5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={localStyles.headerGradient}
      >
        <View style={localStyles.headerContent}>
          <View style={localStyles.userInfoSection}>
            <Text style={localStyles.welcomeText}>Welcome back,</Text>
            <Text style={localStyles.nameText}>{userName || "User"}</Text>
            <Link href={"/pages/profile"} asChild>
              <TouchableOpacity style={localStyles.roleContainer}>
                <Text style={localStyles.roleText}>{userRole || "Member"}</Text>
              </TouchableOpacity>
            </Link>
          </View>
          
          <View style={localStyles.bandInfoContainer}>
            <Text style={localStyles.bandLabel}>YOUR BAND</Text>
            <Text style={localStyles.bandNameText}>{bandName || "Loading..."}</Text>
          </View>
        </View>
        
        {/* Decorative elements */}
        <View style={localStyles.decorElement1} />
        <View style={localStyles.decorElement2} />
        <View style={localStyles.decorElement3} />
      </LinearGradient>

      {/* Main Content Area */}
      <ScrollView 
        style={localStyles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={localStyles.scrollContent}
      >
        <View style={localStyles.contentContainer}>
          <Text style={localStyles.sectionTitle}>Quick Actions</Text>
          
          {/* Action Cards - First Row */}
          <View style={localStyles.cardsRow}>
            <Link href={"/(tabs)/pages/scheduledpractices"} asChild style={localStyles.cardWrapper}>
              <TouchableOpacity style={localStyles.actionCard}>
                <View style={[localStyles.iconCircle, { backgroundColor: "#5046E5" }]}>
                  <Ionicons name="calendar" size={24} color="#fff" />
                </View>
                <Text style={localStyles.cardTitle}>Scheduled Practices</Text>
                <Text style={localStyles.cardSubtitle}>Your next rehearsals</Text>
              </TouchableOpacity>
            </Link>
            
            <Link href={"/pages/setlists"} asChild style={localStyles.cardWrapper}>
              <TouchableOpacity style={localStyles.actionCard}>
                <View style={[localStyles.iconCircle, { backgroundColor: "#FF6B6B" }]}>
                  <Ionicons name="list" size={24} color="#fff" />
                </View>
                <Text style={localStyles.cardTitle}>Setlists</Text>
                <Text style={localStyles.cardSubtitle}>View generated setlists</Text>
              </TouchableOpacity>
            </Link>
          </View>
          
          {/* Second Row */}
          <View style={localStyles.cardsRow}>
            <Link href={"/pages/viewtasks"} asChild style={localStyles.cardWrapper}>
              <TouchableOpacity style={localStyles.actionCard}>
                <View style={[localStyles.iconCircle, { backgroundColor: "#2CC990" }]}>
                  <Ionicons name="checkmark-done" size={24} color="#fff" />
                </View>
                <Text style={localStyles.cardTitle}>View Tasks</Text>
                <Text style={localStyles.cardSubtitle}>Manage assignments</Text>
              </TouchableOpacity>
            </Link>

            <Link href={"/pages/availabilitycalendar"} asChild style={localStyles.cardWrapper}>
              <TouchableOpacity style={localStyles.actionCard}>
                <View style={[localStyles.iconCircle, { backgroundColor: "#9C27B0" }]}>
                  <Ionicons name="calendar" size={24} color="#fff" />
                </View>
                <Text style={localStyles.cardTitle}>Availability calendar</Text>
              </TouchableOpacity>
            </Link>
          </View>
          
          {/* Events Section */}
          <Text style={localStyles.sectionTitle}>Upcoming Events</Text>
          <Link href={"/pages/event"} asChild>
            <TouchableOpacity style={localStyles.eventsCard}>
              <LinearGradient
                colors={["#FF6B6B", "#FF8E53"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={localStyles.eventsGradient}
              >
                <View style={localStyles.eventsCardContent}>
                  <View style={localStyles.eventsTextContainer}>
                    <Text style={localStyles.eventsTitle}>Events & Performances</Text>
                    <Text style={localStyles.eventsSubtitle}>View your upcoming schedule</Text>
                  </View>
                  <View style={localStyles.arrowCircle}>
                    <Ionicons name="arrow-forward" size={20} color="#FF6B6B" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Link>

          {/* Statistics Cards */}
          <Text style={localStyles.sectionTitle}>Quick Stats</Text>
          <View style={localStyles.statsContainer}>
            <View style={localStyles.statCard}>
              <Text style={localStyles.statNumber}>12</Text>
              <Text style={localStyles.statLabel}>Songs Learned</Text>
            </View>
            <View style={localStyles.statCard}>
              <Text style={localStyles.statNumber}>3</Text>
              <Text style={localStyles.statLabel}>This Month</Text>
            </View>
            <View style={localStyles.statCard}>
              <Text style={localStyles.statNumber}>8</Text>
              <Text style={localStyles.statLabel}>Practice Hours</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Enhanced professional styles
const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  headerGradient: {
    height: height * 0.32,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
    position: "relative",
  },
  headerContent: {
    padding: 24,
    paddingTop: StatusBar.currentHeight + 30,
    flex: 1,
    zIndex: 2,
  },
  userInfoSection: {
    flex: 1,
    justifyContent: "flex-start",
  },
  welcomeText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "500",
  },
  nameText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 28,
    marginTop: 4,
    marginBottom: 12,
  },
  roleContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  roleText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  bandInfoContainer: {
    marginTop: "auto",
    marginBottom: 20,
  },
  bandLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  bandNameText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  decorElement1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    top: -30,
    right: -20,
    zIndex: 1,
  },
  decorElement2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    bottom: 30,
    left: -20,
    zIndex: 1,
  },
  decorElement3: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    top: 60,
    right: width / 2 - 100,
    zIndex: 1,
  },
  contentContainer: {
    padding: 20,
    marginTop: -20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    marginTop: 24,
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardWrapper: {
    width: (width - 52) / 2,
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    height: 140,
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#888",
    lineHeight: 18,
    marginTop: 4,
  },
  eventsCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 8,
  },
  eventsGradient: {
    borderRadius: 16,
  },
  eventsCardContent: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventsTextContainer: {
    flex: 1,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  eventsSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5046E5",
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    textAlign: "center",
  },
});

export default Home;
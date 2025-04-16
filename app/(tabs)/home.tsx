import { View, Text, Image, StyleSheet, Dimensions } from "react-native";
import styles from "../styles";
import React, { useEffect, useState } from "react";
import { Link } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

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
    <View style={{ flex: 1 }}>
      {/* Enhanced profile container with gradient background */}
      <View
        style={[styles.home_container_profile, localStyles.enhancedContainer]}
      >
        {/* Gradient background */}
        <LinearGradient
          colors={["#6C63FF", "#4C46E8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={localStyles.gradient}
        />

        {/* Decorative elements */}
        <View style={localStyles.decorElement1} />
        <View style={localStyles.decorElement2} />

        {/* Content */}
        <View style={localStyles.contentContainer}>
          <Text style={[styles.container_text_main, localStyles.welcomeText]}>
            Welcome {userName}!
          </Text>

          {/* Profile Section */}
          <Link href={"/pages/profile"}>
            <View
              style={[
                styles.container_text_main_view,
                localStyles.roleContainer,
              ]}
            >
              <Text
                style={[
                  styles.container_text_main_view_text,
                  localStyles.roleText,
                ]}
              >
                {userRole}
              </Text>
            </View>
          </Link>
          <Text style={localStyles.bandNameText}>Band Name: {bandName}</Text>
        </View>
      </View>
      <View style={styles.double_card_container}>
        {/* 1st double card*/}
        <View style={styles.double_card}>
          <Link href={"/chat"} style={styles.double_card_link}>
            <View style={styles.double_card_link_view}>
              <Text style={styles.double_card_text}>Schedule Practices</Text>
            </View>
          </Link>
        </View>

        {/* 2nd double card*/}
        <View style={styles.double_card}>
          <Link href={"/chat"} style={styles.double_card_link}>
            <View style={styles.double_card_link_view}>
              <Text style={styles.double_card_text}>Setlist</Text>
            </View>
          </Link>
        </View>
      </View>
      <View style={styles.calendar_card}>
        <Link href={"/pages/event"} style={styles.double_card_link}>
          <View style={styles.double_card_link_view}>
            <Text style={styles.calendar_text}>Events</Text>
          </View>
        </Link>
      </View>
      
    </View>
  );
};

// Additional styles for the enhanced profile section
const localStyles = StyleSheet.create({
  enhancedContainer: {
    position: "relative",
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorElement1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    top: -30,
    right: -20,
  },
  decorElement2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    bottom: 20,
    left: -20,
  },
  contentContainer: {
    padding: 16,
    zIndex: 1,
  },
  welcomeText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 24,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  roleContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  roleText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  bandNameText: {
    color: "#ffffff",
    fontSize: 20,
    margin: 10,
    opacity: 0.9,
  },
});

export default Home;

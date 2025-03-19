import { View, Text, Image } from "react-native";
import styles from "../styles";
import React, { useEffect, useState } from "react";
import { Link } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../FirebaseConfig";

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
      <View style={styles.home_container_profile}>
        <Text style={styles.container_text_main}>Welcome {userName}!</Text>

        {/* Profile Section */}
        <Link href={"/pages/profile"}>
          <View style={styles.container_text_main_view}>
            <Text style={styles.container_text_main_view_text}>{userRole}</Text>
            <Image
              source={require("../../assets/images/favicon.png")}
              style={styles.home_profile_image}
            />
          </View>
        </Link>
        <Text style={{color: "gray", fontSize: 20, margin: 10}}>Band Name: {bandName}</Text>
      </View>
      <View style={styles.calendar_card}>
        <Link href={"/pages/event"} style={styles.double_card_link}>
          <View style={styles.double_card_link_view}>
            <Text style={styles.calendar_text}>Events</Text>
          </View>
        </Link>
      </View>
      <View style={styles.double_card_container}>
        {/* 1st double card*/}
        <View style={styles.double_card}>
          <Link href={"/contact"} style={styles.double_card_link}>
            <View style={styles.double_card_link_view}>
              <Text style={styles.double_card_text}>Schedule Practices</Text>
            </View>
          </Link>
        </View>

        {/* 2nd double card*/}
        <View style={styles.double_card}>
          <Link href={"/contact"} style={styles.double_card_link}>
            <View style={styles.double_card_link_view}>
              <Text style={styles.double_card_text}>Setlist</Text>
            </View>
          </Link>
        </View>
      </View>
    </View>
  );
};

export default Home;

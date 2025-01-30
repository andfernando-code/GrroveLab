import { View, Text } from "react-native";
import styles from "../styles";
import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../FirebaseConfig";

const Home = () => {
  

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.home_container_profile}>
        <Text style={styles.container_text_main}>Welcome Nipuna!</Text>
      </View>
      <View style={styles.calendar_card}>
        <Text style={styles.calendar_text}>Calendar</Text>
      </View>
      <View style={styles.double_card_container}>
        <View style={styles.double_card}>
          <Text style={styles.double_card_text}>Setlist</Text>
        </View>
        <View style={styles.double_card}>
          <Text style={styles.double_card_text}>Chat</Text>
        </View>
      </View>
    </View>
  );
};

export default Home;

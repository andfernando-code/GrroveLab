import { View, Text } from "react-native";
import styles from "../styles";
import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../FirebaseConfig";
import { Link } from "expo-router";
import { Image, ImageProps } from "react-native";

type ImageSourceType = ImageProps["source"];

const Home = () => {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.home_container_profile}>
        <Text style={styles.container_text_main}>Welcome Nipuna!</Text>
        <Image
          source={require("../../assets/images/favicon.png")}
          style={styles.home_profile_image}
        />
      </View>
      <View style={styles.calendar_card}>
        <Link href={"/pages/calendar"} style={styles.double_card_link}>
          <View style={styles.double_card_link_view}>
            <Text style={styles.calendar_text}>Calendar</Text>
          </View>
        </Link>
      </View>
      <View style={styles.double_card_container}>
        {/* 1st double card*/}
        <View style={styles.double_card}>
          <Link href={"/contact"} style={styles.double_card_link}>
            <View style={styles.double_card_link_view}>
              <Text style={styles.double_card_text}>Setlist</Text>
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

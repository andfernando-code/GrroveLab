import React from "react";
import {
  Image,
  Platform,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Text } from "react-native";
import styles from "../styles.js";
import { Link } from "expo-router";
import { StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";

const CARD_DATA = [
  {
    id: "1",
    title: "Calendar",
    description: "You can see sheduled practices and events in here",
    image: "https://www.seekpng.com/png/detail/265-2652798_events-3d-icon-icon-calendar.png",
  },
  {
    id: "2",
    title: "Setlist",
    description: "you can see every event's setlists in here",
    image: "https://audioboom.com/i/40911021/1400x1400/c",
  },
  {
    id: "3",
    title: "Chat",
    description: "Connect with group members",
    image: "https://www.shutterstock.com/image-vector/chat-icon-symbol-vector-illustration-600nw-1589556166.jpg",
  },
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {CARD_DATA.map((card) => (
          <Link
            href={{
              pathname: "/(tabs)/[id]",
              params: { ...card }, // card.id is already included in card
            }}
            asChild
          >
            <TouchableOpacity style={styles.card}>
              <Image
                source={{ uri: card.image }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDescription}>{card.description}</Text>
              </View>
            </TouchableOpacity>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

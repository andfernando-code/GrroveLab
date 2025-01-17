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
    title: "First Card",
    description: "This is the first card description",
    image: "https://picsum.photos/300/200",
  },
  {
    id: "2",
    title: "Second Card",
    description: "This is the second card description",
    image: "https://picsum.photos/300/201",
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

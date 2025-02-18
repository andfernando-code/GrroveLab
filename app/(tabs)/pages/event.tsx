import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, Alert, RefreshControl, ScrollView, Pressable } from "react-native";
import { db } from "../../../FirebaseConfig";
import styles from "../../styles";
import {
  collection,
  getDocs,
  query,
  orderBy,
  DocumentData,
} from "firebase/firestore";
import { Link, useRouter } from "expo-router";

interface DataItem {
  id: string;
  name: string;
  date: string;
  description: string;
}

const Event = () => {
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const getItems = async () => {
    try {
      setLoading(true);
      const eventsQuery = query(
        collection(db, "events"),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(eventsQuery);
      const itemsList: DataItem[] = [];

      querySnapshot.forEach((doc) => {
        itemsList.push({
          id: doc.id,
          ...(doc.data() as Omit<DataItem, "id">),
        });
      });

      setItems(itemsList);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch events");
      console.error("Error getting documents:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    getItems();
  };

  useEffect(() => {
    getItems();
  }, []);

  const handleEventPress = (item: DataItem) => {
    router.push({
      pathname: "/(tabs)/pages/eventItem",
      params: {
        id: item.id,
        name: item.name,
        date: item.date,
        description: item.description,
      },
    });
  };

  if (loading) {
    return (
      <View>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View>
        {items.map((item) => (
          <Pressable
            key={item.id}
            style={styles.event_item}
            onPress={() => handleEventPress(item)}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "bold",
                fontSize: 20,
                fontFamily: "times new roman",
              }}
            >
              {item.name}
            </Text>
            <Text style={{ color: "#fff" }}>Date: {item.date}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

export default Event;
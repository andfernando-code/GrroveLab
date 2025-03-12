import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, Alert, RefreshControl, ScrollView, Pressable } from "react-native";
import { db } from "../../../FirebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "../../styles";
import {
  collection,
  getDocs,
  query,
  orderBy,
  DocumentData,
  where
} from "firebase/firestore";
import { Link, useRouter } from "expo-router";

interface DataItem {
  id: string;
  location: string;
  dateTime: string;
  specialNotes?: string;
}

const Event = () => {
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bandId, setBandId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchBandId = async () => {
      try {
        const storedBandName = await AsyncStorage.getItem("bandName");
        if (storedBandName) {
          const bandQuery = query(collection(db, "bands"), where("bandName", "==", storedBandName));
          const bandSnapshot = await getDocs(bandQuery);
          if (!bandSnapshot.empty) {
            setBandId(bandSnapshot.docs[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching band ID:", error);
      }
    };

    fetchBandId();
  }, []);

  useEffect(() => {
    if (bandId) {
      getItems();
    }
  }, [bandId]);

  const getItems = async () => {
    if (!bandId) return;

    try {
      setLoading(true);
      const eventsCollection = collection(db, `bands/${bandId}/events`);
      const eventsQuery = query(eventsCollection, orderBy("dateTime", "asc"));
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

  const handleEventPress = (item: DataItem) => {
    router.push({
      pathname: "/(tabs)/pages/eventItem",
      params: {
        id: item.id,
        location: item.location,
        dateTime: item.dateTime,
        specialNotes: item.specialNotes || "",
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View>
        {items.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 20, color: "#fff" }}>
            No events available
          </Text>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.id}
              style={styles.event_item}
              onPress={() => handleEventPress(item)}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 20, fontFamily: "times new roman" }}>
                📍 {item.location}
              </Text>
              <Text style={{ color: "#fff" }}>🗓 {new Date(item.dateTime).toDateString()}</Text>
              <Text style={{ color: "#fff" }}>⏰ {new Date(item.dateTime).toLocaleTimeString()}</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default Event;

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { db } from "../../../FirebaseConfig";
import styles from "../../styles";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  DocumentData,
  Timestamp,
} from "firebase/firestore";

interface DataItem {
  id: string;
  // Add your data fields here
  name: string;
  date: string;
  description: string;
  // ... other fields
}

const Event = () => {
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);

  const getItems = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "events"));
      const itemsList: DataItem[] = [];

      querySnapshot.forEach((doc) => {
        itemsList.push({
          id: doc.id,
          ...(doc.data() as Omit<DataItem, "id">),
        });
      });

      setItems(itemsList);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch items");
      console.error("Error getting documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getItems();
  }, []);

  return (
    <View>
      <View>
        {items.map((item) => (
          <View key={item.id} style={styles.event_item}>
            <Text
              style={{
                color: "#fff",
                fontWeight: "bold",
                fontSize: 20,
                fontFamily: "times new roman",
              }}
            >
              {item.name}
              Date: {item.date}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default Event;

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert, ActivityIndicator, Modal, TouchableOpacity, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "react-native-calendars";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define proper TypeScript interfaces
interface eventItem {
  id: string;
  location: string;
  dateTime: string;
  specialNotes?: string;
  createdAt: Date;
}

interface MarkedDates {
  [date: string]: {
    selected: boolean;
    selectedColor: string;
  };
}

const AddEvent = () => {
  const [bandId, setBandId] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [specialNotes, setSpecialNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [events, setevents] = useState<eventItem[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});

  // Date & Time Picker State
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<eventItem | null>(null);

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
      fetchevents();
    }
  }, [bandId]);

  // Fetch events and mark dates
  const fetchevents = async () => {
    try {
      const eventQuery = collection(db, `bands/${bandId}/events`);
      const eventSnapshot = await getDocs(eventQuery);

      const eventList = eventSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as eventItem[];

      setevents(eventList);

      // Mark dates in green
      const marked: MarkedDates = {};
      eventList.forEach((item) => {
        const dateKey = item.dateTime.split("T")[0];
        marked[dateKey] = { selected: true, selectedColor: "#6e0307" };
      });

      setMarkedDates(marked);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const handleAddevent = async () => {
    if (!location || !date) {
      Alert.alert("Error", "Location and Date/Time are required!");
      return;
    }

    if (!bandId) {
      Alert.alert("Error", "Band ID not found. Try again later.");
      return;
    }

    try {
      setLoading(true);

      const newevent = {
        location,
        dateTime: date.toISOString(),
        specialNotes,
        createdAt: new Date(),
      };

      await addDoc(collection(db, `bands/${bandId}/events`), newevent);

      Alert.alert("Success", "event added successfully!");
      setLocation("");
      setSpecialNotes("");
      setDate(new Date());

      fetchevents(); // Refresh list
    } catch (error) {
      console.error("Error adding event:", error);
      Alert.alert("Error", "Failed to add event");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteevent = async (eventId: string) => {
    Alert.alert("Confirm", "Are you sure you want to remove this event?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, `bands/${bandId}/events`, eventId));
            Alert.alert("Success", "Event removed successfully!");
            setModalVisible(false);
            fetchevents(); // Refresh list
          } catch (error) {
            console.error("Error deleting event:", error);
            Alert.alert("Error", "Failed to remove event");
          }
        },
      },
    ]);
  };

  // Handle date selection
  const handleDateSelect = (day: { dateString: string }) => {
    const selectedevents = events.filter((s) => s.dateTime.startsWith(day.dateString));
    if (selectedevents.length > 0) {
      setSelectedEvent(selectedevents[0]);
      setModalVisible(true);
    }
  };

  return (
    <View style={{ padding: 20, flex: 1 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" }}>
        Manage Band events
      </Text>

      {/* 📅 Select Date */}
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
        <Text>{date.toDateString()}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      {/* ⏰ Select Time */}
      <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.input}>
        <Text>{date.toLocaleTimeString()}</Text>
      </TouchableOpacity>
      {showTimePicker && (
        <DateTimePicker
          value={date}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) setDate(selectedTime);
          }}
        />
      )}

      <TextInput placeholder="Location" value={location} onChangeText={setLocation} style={styles.input} placeholderTextColor="gray" />
      <TextInput placeholder="Special Notes (Optional)" value={specialNotes} onChangeText={setSpecialNotes} style={styles.input} placeholderTextColor="gray" />

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Add Event" onPress={handleAddevent} />
      )}

      <Text style={{ fontSize: 20, fontWeight: "bold", marginTop: 30, marginBottom: 10 }}>Added Events</Text>

      {/* 📆 Calendar View */}
      <Calendar markedDates={markedDates} onDayPress={handleDateSelect} />

      {/* 📌 Modal for Event Details */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedEvent && (
              <>
                <Text style={styles.modalTitle}>Event Details</Text>
                <Text>📍 Location: {selectedEvent.location}</Text>
                <Text>🗓 Date: {new Date(selectedEvent.dateTime).toDateString()}</Text>
                <Text>⏰ Time: {new Date(selectedEvent.dateTime).toLocaleTimeString()}</Text>
                {selectedEvent.specialNotes ? <Text>📝 Notes: {selectedEvent.specialNotes}</Text> : null}
                <Button title="Remove" color="red" onPress={() => handleDeleteevent(selectedEvent.id)} />
              </>
            )}
            <Button title="Close" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Convert the object literal to StyleSheet for better performance
const styles = StyleSheet.create({
  input: { 
    width: "100%", 
    height: 50, 
    borderColor: "#000", 
    borderWidth: 1, 
    marginBottom: 10, 
    paddingHorizontal: 10, 
    borderRadius: 5, 
    justifyContent: "center" 
  },
  modalContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "rgba(0,0,0,0.5)" 
  },
  modalContent: { 
    backgroundColor: "white", 
    padding: 20, 
    borderRadius: 10, 
    width: "80%" 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginBottom: 10 
  },
});

export default AddEvent;
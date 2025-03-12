import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert, ActivityIndicator, Modal, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "react-native-calendars";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Schedule = () => {
  const [bandId, setBandId] = useState(null);
  const [location, setLocation] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [markedDates, setMarkedDates] = useState({});

  // Date & Time Picker State
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

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
      fetchSchedules();
    }
  }, [bandId]);

  // Fetch schedules and mark dates
  const fetchSchedules = async () => {
    try {
      const scheduleQuery = collection(db, `bands/${bandId}/schedules`);
      const scheduleSnapshot = await getDocs(scheduleQuery);

      const scheduleList = scheduleSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSchedules(scheduleList);

      // Mark dates in yellow
      const marked = {};
      scheduleList.forEach((item) => {
        const dateKey = item.dateTime.split("T")[0];
        marked[dateKey] = { selected: true, selectedColor: "green" };
      });

      setMarkedDates(marked);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    }
  };

  const handleAddSchedule = async () => {
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

      const newSchedule = {
        location,
        dateTime: date.toISOString(),
        specialNotes,
        createdAt: new Date(),
      };

      await addDoc(collection(db, `bands/${bandId}/schedules`), newSchedule);

      Alert.alert("Success", "Schedule added successfully!");
      setLocation("");
      setSpecialNotes("");
      setDate(new Date());

      fetchSchedules(); // Refresh list
    } catch (error) {
      console.error("Error adding schedule:", error);
      Alert.alert("Error", "Failed to add schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    Alert.alert("Confirm", "Are you sure you want to remove this schedule?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, `bands/${bandId}/schedules`, scheduleId));
            Alert.alert("Success", "Schedule removed successfully!");
            setModalVisible(false);
            fetchSchedules(); // Refresh list
          } catch (error) {
            console.error("Error deleting schedule:", error);
            Alert.alert("Error", "Failed to remove schedule");
          }
        },
      },
    ]);
  };

  // Handle date selection
  const handleDateSelect = (day) => {
    const selectedSchedules = schedules.filter((s) => s.dateTime.startsWith(day.dateString));
    if (selectedSchedules.length > 0) {
      setSelectedEvent(selectedSchedules[0]);
      setModalVisible(true);
    }
  };

  return (
    <View style={{ padding: 20, flex: 1 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" }}>
        Manage Band Schedules
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
        <Button title="Add Schedule" onPress={handleAddSchedule} />
      )}

      <Text style={{ fontSize: 20, fontWeight: "bold", marginTop: 30, marginBottom: 10 }}>Scheduled Practices</Text>

      {/* 📆 Calendar View */}
      <Calendar markedDates={markedDates} onDayPress={handleDateSelect} />

      {/* 📌 Modal for Event Details */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedEvent && (
              <>
                <Text style={styles.modalTitle}>Practice Details</Text>
                <Text>📍 Location: {selectedEvent.location}</Text>
                <Text>🗓 Date: {new Date(selectedEvent.dateTime).toDateString()}</Text>
                <Text>⏰ Time: {new Date(selectedEvent.dateTime).toLocaleTimeString()}</Text>
                {selectedEvent.specialNotes ? <Text>📝 Notes: {selectedEvent.specialNotes}</Text> : null}
                <Button title="Remove" color="red" onPress={() => handleDeleteSchedule(selectedEvent.id)} />
              </>
            )}
            <Button title="Close" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = {
  input: { width: "100%", height: 50, borderColor: "#000", borderWidth: 1, marginBottom: 10, paddingHorizontal: 10, borderRadius: 5, justifyContent: "center" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "white", padding: 20, borderRadius: 10, width: "80%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
};

export default Schedule;

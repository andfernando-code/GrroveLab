import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert, ActivityIndicator, Modal, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "react-native-calendars";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define proper TypeScript interfaces
interface ScheduleItem {
  id: string;
  location: string;
  dateTime: string;
  specialNotes?: string;
  createdAt: Date;
}

interface UnavailabilityItem {
  id: string;
  date: string;
  reason: string;
  createdAt: Date;
  userEmail: string;
  userName: string;
}

interface MarkedDates {
  [date: string]: {
    selected: boolean;
    selectedColor: string;
    textColor?: string;
    disabled?: boolean;
    disableTouchEvent?: boolean;
    customStyles?: any;
  };
}

const Schedule = () => {
  const [bandId, setBandId] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [specialNotes, setSpecialNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [unavailabilityItems, setUnavailabilityItems] = useState<UnavailabilityItem[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});

  // Date & Time Picker State
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleItem | null>(null);

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
      fetchUnavailabilityData();
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
      })) as ScheduleItem[];

      setSchedules(scheduleList);
      updateMarkedDates(scheduleList, unavailabilityItems);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    }
  };

  // Fetch unavailability data
  const fetchUnavailabilityData = async () => {
    try {
      const unavailabilityQuery = collection(db, `bands/${bandId}/unavailability`);
      const unavailabilitySnapshot = await getDocs(unavailabilityQuery);

      const unavailabilityList = unavailabilitySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UnavailabilityItem[];

      setUnavailabilityItems(unavailabilityList);
      updateMarkedDates(schedules, unavailabilityList);
    } catch (error) {
      console.error("Error fetching unavailability data:", error);
    }
  };

  // Update marked dates with both schedules and unavailability
  const updateMarkedDates = (scheduleList: ScheduleItem[], unavailabilityList: UnavailabilityItem[]) => {
    const marked: MarkedDates = {};

    // Mark scheduled dates in green
    scheduleList.forEach((item) => {
      const dateKey = item.dateTime.split("T")[0];
      marked[dateKey] = { 
        selected: true, 
        selectedColor: "#4CAF50", // Green for scheduled
        textColor: "white"
      };
    });

    // Mark unavailable dates in red (this will override scheduled dates if they conflict)
    unavailabilityList.forEach((item) => {
      if (marked[item.date]) {
        // If there's already a schedule on an unavailable day, show with mixed styling
        marked[item.date] = {
          selected: true,
          selectedColor: "#FF9800", // Orange for conflict
          textColor: "white",
          customStyles: {
            container: {
              backgroundColor: "#FF9800",
              borderWidth: 2,
              borderColor: "#FF4444"
            },
            text: {
              color: "white",
              fontWeight: "bold"
            }
          }
        };
      } else {
        marked[item.date] = { 
          selected: true, 
          selectedColor: "#FF4444", // Red for unavailable
          textColor: "white"
        };
      }
    });

    setMarkedDates(marked);
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

    // Check if the selected date has any unavailable members
    const selectedDateString = date.toISOString().split('T')[0];
    const unavailableOnDate = unavailabilityItems.filter(item => item.date === selectedDateString);
    
    if (unavailableOnDate.length > 0) {
      const unavailableMembers = unavailableOnDate.map(item => item.userName).join(", ");
      
      Alert.alert(
        "Warning: Members Unavailable", 
        `The following members are unavailable on ${date.toDateString()}:\n\n${unavailableMembers}\n\nDo you still want to schedule practice on this date?`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Schedule Anyway",
            onPress: () => proceedWithScheduling()
          }
        ]
      );
      return;
    }

    proceedWithScheduling();
  };

  const proceedWithScheduling = async () => {
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
  const handleDateSelect = (day: { dateString: string }) => {
    const selectedSchedules = schedules.filter((s) => s.dateTime.startsWith(day.dateString));
    const selectedUnavailability = unavailabilityItems.filter((u) => u.date === day.dateString);
    
    if (selectedSchedules.length > 0) {
      setSelectedEvent(selectedSchedules[0]);
      setModalVisible(true);
    } else if (selectedUnavailability.length > 0) {
      // Show unavailability details
      const unavailableMembers = selectedUnavailability.map(item => 
        `${item.userName}: ${item.reason}`
      ).join('\n');
      
      Alert.alert(
        "Members Unavailable",
        `The following members are unavailable on ${day.dateString}:\n\n${unavailableMembers}`,
        [{ text: "OK" }]
      );
    }
  };

  // Get unavailable members for a specific date
  const getUnavailableMembersForDate = (dateString: string) => {
    return unavailabilityItems.filter(item => item.date === dateString);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" }}>
        Manage Band Schedules
      </Text>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Calendar Legend:</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#4CAF50" }]} />
          <Text style={styles.legendText}>Scheduled Practice</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#FF4444" }]} />
          <Text style={styles.legendText}>Members Unavailable</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#FF9800" }]} />
          <Text style={styles.legendText}>Practice + Unavailable Members</Text>
        </View>
      </View>

      {/* 📅 Select Date */}
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
        <Text style={styles.inputText}>📅 {date.toDateString()}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      {/* ⏰ Select Time */}
      <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.input}>
        <Text style={styles.inputText}>⏰ {date.toLocaleTimeString()}</Text>
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

      <TextInput 
        placeholder="Location (e.g., Studio A, Community Center)" 
        value={location} 
        onChangeText={setLocation} 
        style={styles.input} 
        placeholderTextColor="gray" 
      />
      
      <TextInput 
        placeholder="Special Notes (Optional)" 
        value={specialNotes} 
        onChangeText={setSpecialNotes} 
        style={styles.input} 
        placeholderTextColor="gray"
        multiline
        numberOfLines={2}
      />

      {/* Show warning if selected date has unavailable members */}
      {(() => {
        const selectedDateString = date.toISOString().split('T')[0];
        const unavailableMembers = getUnavailableMembersForDate(selectedDateString);
        
        if (unavailableMembers.length > 0) {
          return (
            <View style={styles.warningContainer}>
              <Text style={styles.warningTitle}>⚠️ Warning</Text>
              <Text style={styles.warningText}>
                {unavailableMembers.length} member(s) unavailable on selected date:
              </Text>
              {unavailableMembers.map((member, index) => (
                <Text key={index} style={styles.warningMember}>
                  • {member.userName}: {member.reason}
                </Text>
              ))}
            </View>
          );
        }
        return null;
      })()}

      {loading ? (
        <ActivityIndicator size="large" color="#6C63FF" style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.addButton}>
          <Button title="Add Schedule" onPress={handleAddSchedule} color="#6C63FF" />
        </View>
      )}

      <Text style={{ fontSize: 20, fontWeight: "bold", marginTop: 30, marginBottom: 10 }}>
        Band Calendar
      </Text>

      {/* 📆 Calendar View */}
      <Calendar 
        markedDates={markedDates} 
        onDayPress={handleDateSelect}
        markingType={'custom'}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#6C63FF',
          selectedDayBackgroundColor: '#6C63FF',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#6C63FF',
          dayTextColor: '#2d4150',
          textDisabledColor: '#d9e1e8',
          dotColor: '#6C63FF',
          selectedDotColor: '#ffffff',
          arrowColor: '#6C63FF',
          disabledArrowColor: '#d9e1e8',
          monthTextColor: '#6C63FF',
          indicatorColor: '#6C63FF',
          textDayFontWeight: '300',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '300',
          textDayFontSize: 16,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 13
        }}
      />

      {/* 📌 Modal for Event Details */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedEvent && (
              <>
                <Text style={styles.modalTitle}>Practice Details</Text>
                <Text style={styles.modalDetail}>📍 Location: {selectedEvent.location}</Text>
                <Text style={styles.modalDetail}>🗓 Date: {new Date(selectedEvent.dateTime).toDateString()}</Text>
                <Text style={styles.modalDetail}>⏰ Time: {new Date(selectedEvent.dateTime).toLocaleTimeString()}</Text>
                {selectedEvent.specialNotes ? (
                  <Text style={styles.modalDetail}>📝 Notes: {selectedEvent.specialNotes}</Text>
                ) : null}
                
                {/* Show unavailable members for this date */}
                {(() => {
                  const eventDate = selectedEvent.dateTime.split('T')[0];
                  const unavailableMembers = getUnavailableMembersForDate(eventDate);
                  
                  if (unavailableMembers.length > 0) {
                    return (
                      <View style={styles.unavailableSection}>
                        <Text style={styles.unavailableTitle}>⚠️ Unavailable Members:</Text>
                        {unavailableMembers.map((member, index) => (
                          <Text key={index} style={styles.unavailableMember}>
                            • {member.userName}: {member.reason}
                          </Text>
                        ))}
                      </View>
                    );
                  }
                  return null;
                })()}
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={() => handleDeleteSchedule(selectedEvent.id)}
                  >
                    <Text style={styles.deleteButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// Convert the object literal to StyleSheet for better performance
const styles = StyleSheet.create({
  input: { 
    width: "100%", 
    height: 50, 
    borderColor: "#ddd", 
    borderWidth: 1, 
    marginBottom: 10, 
    paddingHorizontal: 15, 
    borderRadius: 8, 
    justifyContent: "center",
    backgroundColor: "#f9f9f9"
  },
  inputText: {
    fontSize: 16,
    color: "#333"
  },
  addButton: {
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden'
  },
  legendContainer: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333"
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10
  },
  legendText: {
    fontSize: 14,
    color: "#666"
  },
  warningContainer: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffeaa7",
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#856404",
    marginBottom: 5
  },
  warningText: {
    fontSize: 14,
    color: "#856404",
    marginBottom: 8
  },
  warningMember: {
    fontSize: 13,
    color: "#856404",
    marginLeft: 10,
    marginBottom: 2
  },
  modalContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "rgba(0,0,0,0.5)" 
  },
  modalContent: { 
    backgroundColor: "white", 
    padding: 25, 
    borderRadius: 15, 
    width: "90%",
    maxWidth: 400
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginBottom: 15,
    textAlign: "center",
    color: "#333"
  },
  modalDetail: {
    fontSize: 16,
    marginBottom: 8,
    color: "#555"
  },
  unavailableSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#fff3cd",
    borderRadius: 8
  },
  unavailableTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#856404",
    marginBottom: 5
  },
  unavailableMember: {
    fontSize: 13,
    color: "#856404",
    marginBottom: 2
  },
  modalButtons: {
    marginTop: 20,
    marginBottom: 10
  },
  deleteButton: {
    backgroundColor: "#FF4444",
    padding: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold"
  },
  closeButton: {
    backgroundColor: "#6C63FF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold"
  }
});

export default Schedule;
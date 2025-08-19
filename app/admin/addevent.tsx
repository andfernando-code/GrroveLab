import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  Modal, 
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "react-native-calendars";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get('window');

// Define proper TypeScript interfaces
interface EventItem {
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
    textColor?: string;
  };
}

const AddEvent = () => {
  const [bandId, setBandId] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [specialNotes, setSpecialNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});

  // Date & Time Picker State
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

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
      fetchEvents();
    }
  }, [bandId]);

  const fetchEvents = async () => {
    try {
      const eventQuery = collection(db, `bands/${bandId}/events`);
      const eventSnapshot = await getDocs(eventQuery);

      const eventList = eventSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EventItem[];

      setEvents(eventList);

      // Mark dates with modern styling
      const marked: MarkedDates = {};
      eventList.forEach((item) => {
        const dateKey = item.dateTime.split("T")[0];
        marked[dateKey] = { 
          selected: true, 
          selectedColor: "#3B82F6",
          textColor: "#FFFFFF"
        };
      });

      setMarkedDates(marked);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const handleAddEvent = async () => {
    if (!location.trim() || !date) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }

    if (!bandId) {
      Alert.alert("Error", "Band ID not found. Please try again later.");
      return;
    }

    try {
      setLoading(true);

      const newEvent = {
        location: location.trim(),
        dateTime: date.toISOString(),
        specialNotes: specialNotes.trim(),
        createdAt: new Date(),
      };

      await addDoc(collection(db, `bands/${bandId}/events`), newEvent);

      Alert.alert("Success", "Event added successfully!", [
        { text: "OK", onPress: () => {
          setLocation("");
          setSpecialNotes("");
          setDate(new Date());
        }}
      ]);

      fetchEvents();
    } catch (error) {
      console.error("Error adding event:", error);
      Alert.alert("Error", "Failed to add event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert(
      "Delete Event", 
      "Are you sure you want to delete this event? This action cannot be undone.", 
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, `bands/${bandId}/events`, eventId));
              Alert.alert("Success", "Event deleted successfully!");
              setModalVisible(false);
              fetchEvents();
            } catch (error) {
              console.error("Error deleting event:", error);
              Alert.alert("Error", "Failed to delete event. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleDateSelect = (day: { dateString: string }) => {
    const selectedEvents = events.filter((event) => 
      event.dateTime.startsWith(day.dateString)
    );
    if (selectedEvents.length > 0) {
      setSelectedEvent(selectedEvents[0]);
      setModalVisible(true);
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Event Management</Text>
          <Text style={styles.headerSubtitle}>Schedule and manage your band events</Text>
        </View>

        {/* Add Event Form */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Add New Event</Text>
          
          {/* Date Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Event Date</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)} 
              style={styles.dateTimeInput}
            >
              <View style={styles.dateTimeContent}>
                <Text style={styles.dateTimeIcon}>📅</Text>
                <Text style={styles.dateTimeText}>
                  {date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    // Keep the existing time, only change the date
                    const newDateTime = new Date(selectedDate);
                    newDateTime.setHours(date.getHours(), date.getMinutes());
                    setDate(newDateTime);
                  }
                }}
              />
            )}
          </View>

          {/* Time Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Event Time</Text>
            <TouchableOpacity 
              onPress={() => setShowTimePicker(true)} 
              style={styles.dateTimeInput}
            >
              <View style={styles.dateTimeContent}>
                <Text style={styles.dateTimeIcon}>🕐</Text>
                <Text style={styles.dateTimeText}>
                  {date.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
            
            {showTimePicker && (
              <DateTimePicker
                value={date}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) {
                    // Keep the existing date, only change the time
                    const newDateTime = new Date(date);
                    newDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes());
                    setDate(newDateTime);
                  }
                }}
              />
            )}
          </View>

          {/* Location Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Event Location *</Text>
            <TextInput
              placeholder="Enter venue or location"
              value={location}
              onChangeText={setLocation}
              style={styles.textInput}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Notes Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Special Notes</Text>
            <TextInput
              placeholder="Add any special notes or requirements"
              value={specialNotes}
              onChangeText={setSpecialNotes}
              style={[styles.textInput, styles.notesInput]}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Add Event Button */}
          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleAddEvent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Add Event</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Calendar Section */}
        <View style={styles.calendarContainer}>
          <Text style={styles.sectionTitle}>Event Calendar</Text>
          <Text style={styles.calendarSubtitle}>
            Tap on a blue date to view event details
          </Text>
          
          <View style={styles.calendarWrapper}>
            <Calendar
              markedDates={markedDates}
              onDayPress={handleDateSelect}
              theme={{
                backgroundColor: '#FFFFFF',
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: '#374151',
                selectedDayBackgroundColor: '#3B82F6',
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: '#3B82F6',
                dayTextColor: '#1F2937',
                textDisabledColor: '#D1D5DB',
                dotColor: '#3B82F6',
                selectedDotColor: '#FFFFFF',
                arrowColor: '#3B82F6',
                monthTextColor: '#1F2937',
                indicatorColor: '#3B82F6',
                textDayFontFamily: 'System',
                textMonthFontFamily: 'System',
                textDayHeaderFontFamily: 'System',
                textDayFontWeight: '400',
                textMonthFontWeight: '600',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14
              }}
            />
          </View>
        </View>

        {/* Date/Time Pickers - Removed from here since they're now inline */}
      </ScrollView>

      {/* Event Details Modal */}
      <Modal 
        visible={modalVisible} 
        transparent={true} 
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {selectedEvent && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Event Details</Text>
                  </View>
                  
                  <View style={styles.eventDetailsContainer}>
                    <View style={styles.eventDetailRow}>
                      <Text style={styles.eventDetailIcon}>📍</Text>
                      <View>
                        <Text style={styles.eventDetailLabel}>Location</Text>
                        <Text style={styles.eventDetailValue}>{selectedEvent.location}</Text>
                      </View>
                    </View>

                    <View style={styles.eventDetailRow}>
                      <Text style={styles.eventDetailIcon}>📅</Text>
                      <View>
                        <Text style={styles.eventDetailLabel}>Date</Text>
                        <Text style={styles.eventDetailValue}>
                          {formatDateTime(selectedEvent.dateTime).date}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.eventDetailRow}>
                      <Text style={styles.eventDetailIcon}>⏰</Text>
                      <View>
                        <Text style={styles.eventDetailLabel}>Time</Text>
                        <Text style={styles.eventDetailValue}>
                          {formatDateTime(selectedEvent.dateTime).time}
                        </Text>
                      </View>
                    </View>

                    {selectedEvent.specialNotes ? (
                      <View style={styles.eventDetailRow}>
                        <Text style={styles.eventDetailIcon}>📝</Text>
                        <View style={styles.notesContainer}>
                          <Text style={styles.eventDetailLabel}>Notes</Text>
                          <Text style={styles.eventDetailValue}>
                            {selectedEvent.specialNotes}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteEvent(selectedEvent.id)}
                    >
                      <Text style={styles.deleteButtonText}>Delete Event</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.closeButton}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateTimeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  dateTimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  chevron: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  calendarWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#3B82F6',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  eventDetailsContainer: {
    padding: 20,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  eventDetailIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  eventDetailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventDetailValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '400',
  },
  notesContainer: {
    flex: 1,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  closeButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddEvent;
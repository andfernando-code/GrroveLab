import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Stack } from 'expo-router';
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "react-native-calendars";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons';

// Define proper TypeScript interfaces
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
  };
}

const Availability = () => {
  const [bandId, setBandId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [unavailabilityItems, setUnavailabilityItems] = useState<UnavailabilityItem[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});

  // Date Picker State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
  const [selectedUnavailability, setSelectedUnavailability] = useState<UnavailabilityItem | null>(null);

  useEffect(() => {
    const fetchUserAndBandData = async () => {
      try {
        const storedBandName = await AsyncStorage.getItem("bandName");
        const storedUserEmail = await AsyncStorage.getItem("userEmail");
        
        if (storedBandName && storedUserEmail) {
          // Get band ID
          const bandQuery = query(collection(db, "bands"), where("bandName", "==", storedBandName));
          const bandSnapshot = await getDocs(bandQuery);
          if (!bandSnapshot.empty) {
            const foundBandId = bandSnapshot.docs[0].id;
            setBandId(foundBandId);
            
            // Get user name
            const userQuery = query(
              collection(db, `bands/${foundBandId}/users`),
              where("email", "==", storedUserEmail)
            );
            const userSnapshot = await getDocs(userQuery);
            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();
              setUserName(userData.name || "");
            }
          }
          setUserEmail(storedUserEmail);
        }
      } catch (error) {
        console.error("Error fetching user and band data:", error);
      }
    };

    fetchUserAndBandData();
  }, []);

  useEffect(() => {
    if (bandId && userEmail) {
      fetchUnavailabilityData();
    }
  }, [bandId, userEmail]);

  // Fetch unavailability data and mark dates
  const fetchUnavailabilityData = async () => {
    try {
      const unavailabilityQuery = collection(db, `bands/${bandId}/unavailability`);
      const unavailabilitySnapshot = await getDocs(unavailabilityQuery);

      const unavailabilityList = unavailabilitySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UnavailabilityItem[];

      setUnavailabilityItems(unavailabilityList);

      // Mark dates in red for unavailable days
      const marked: MarkedDates = {};
      unavailabilityList.forEach((item) => {
        marked[item.date] = { 
          selected: true, 
          selectedColor: "#FF4444",
          textColor: "white"
        };
      });

      setMarkedDates(marked);
    } catch (error) {
      console.error("Error fetching unavailability data:", error);
    }
  };

  const handleAddUnavailability = async () => {
    if (!reason.trim()) {
      Alert.alert("Error", "Please provide a reason for unavailability!");
      return;
    }

    if (!bandId || !userEmail) {
      Alert.alert("Error", "User or band information not found. Try again later.");
      return;
    }

    const dateString = selectedDate.toISOString().split('T')[0];

    try {
      setLoading(true);

      // Check if the date is already marked as unavailable by this user
      const existingItem = unavailabilityItems.find(
        item => item.date === dateString && item.userEmail === userEmail
      );

      if (existingItem) {
        Alert.alert("Error", "You have already marked this date as unavailable!");
        return;
      }

      const newUnavailability = {
        date: dateString,
        reason: reason.trim(),
        createdAt: new Date(),
        userEmail,
        userName,
      };

      await addDoc(collection(db, `bands/${bandId}/unavailability`), newUnavailability);

      Alert.alert("Success", "Unavailability marked successfully!");
      setReason("");
      setSelectedDate(new Date());
      setAddModalVisible(false);

      fetchUnavailabilityData(); // Refresh list
    } catch (error) {
      console.error("Error adding unavailability:", error);
      Alert.alert("Error", "Failed to mark unavailability");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnavailability = async (unavailabilityId: string) => {
    Alert.alert("Confirm", "Are you sure you want to remove this unavailability?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, `bands/${bandId}/unavailability`, unavailabilityId));
            Alert.alert("Success", "Unavailability removed successfully!");
            setModalVisible(false);
            fetchUnavailabilityData(); // Refresh list
          } catch (error) {
            console.error("Error deleting unavailability:", error);
            Alert.alert("Error", "Failed to remove unavailability");
          }
        },
      },
    ]);
  };

  // Handle date selection from calendar
  const handleDateSelect = (day: { dateString: string }) => {
    const selectedUnavailabilities = unavailabilityItems.filter((item) => 
      item.date === day.dateString
    );
    
    if (selectedUnavailabilities.length > 0) {
      setSelectedUnavailability(selectedUnavailabilities[0]);
      setModalVisible(true);
    }
  };

  // Get user's unavailable dates for display
  const getUserUnavailableDates = () => {
    return unavailabilityItems
      .filter(item => item.userEmail === userEmail)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerTitle: 'My Availability',
          headerStyle: { backgroundColor: '#6C63FF' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' }
        }} 
      />
      
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <Text style={styles.headerTitle}>Mark Your Unavailable Days</Text>
              <Text style={styles.headerSubtitle}>
                Red dates indicate when band members are not available
              </Text>
            </View>

            {/* Add Unavailability Button */}
            <View style={styles.actionSection}>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setAddModalVisible(true)}
              >
                <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Mark Unavailable Day</Text>
              </TouchableOpacity>
            </View>

            {/* Calendar View */}
            <View style={styles.calendarContainer}>
              <Text style={styles.sectionTitle}>Band Availability Calendar</Text>
              <Calendar 
                markedDates={markedDates} 
                onDayPress={handleDateSelect}
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
            </View>

            {/* My Unavailable Days List */}
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>My Unavailable Days</Text>
              
              {getUserUnavailableDates().length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-clear" size={64} color="#CCCCCC" />
                  <Text style={styles.emptyStateText}>No unavailable days marked</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Tap "Mark Unavailable Day" to add dates when you're not available
                  </Text>
                </View>
              ) : (
                <View style={styles.unavailabilityList}>
                  {getUserUnavailableDates().map((item) => (
                    <TouchableOpacity 
                      key={item.id} 
                      style={styles.unavailabilityItem}
                      onPress={() => {
                        setSelectedUnavailability(item);
                        setModalVisible(true);
                      }}
                    >
                      <View style={styles.unavailabilityItemContent}>
                        <View style={styles.dateContainer}>
                          <Ionicons name="calendar" size={20} color="#FF4444" />
                          <Text style={styles.dateText}>
                            {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </Text>
                        </View>
                        <Text style={styles.reasonText}>{item.reason}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Add Unavailability Modal */}
        <Modal 
          visible={addModalVisible} 
          transparent={true} 
          animationType="slide"
          onRequestClose={() => setAddModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Mark Unavailable Day</Text>
                <TouchableOpacity 
                  onPress={() => setAddModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666666" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                {/* Date Selection */}
                <Text style={styles.fieldLabel}>Select Date</Text>
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(true)} 
                  style={styles.dateInput}
                >
                  <Ionicons name="calendar-outline" size={20} color="#6C63FF" />
                  <Text style={styles.dateInputText}>
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setSelectedDate(date);
                    }}
                  />
                )}

                {/* Reason Input */}
                <Text style={styles.fieldLabel}>Reason</Text>
                <TextInput
                  placeholder="Why are you unavailable? (e.g., Work commitment, Vacation, etc.)"
                  value={reason}
                  onChangeText={setReason}
                  style={styles.reasonInput}
                  placeholderTextColor="#999999"
                  multiline
                  numberOfLines={3}
                />

                {/* Action Buttons */}
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => {
                      setAddModalVisible(false);
                      setReason("");
                      setSelectedDate(new Date());
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={handleAddUnavailability}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Mark Unavailable</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* View/Delete Unavailability Modal */}
        <Modal 
          visible={modalVisible} 
          transparent={true} 
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {selectedUnavailability && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Unavailability Details</Text>
                    <TouchableOpacity 
                      onPress={() => setModalVisible(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#666666" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalContent}>
                    <View style={styles.detailRow}>
                      <Ionicons name="person" size={20} color="#6C63FF" />
                      <Text style={styles.detailText}>{selectedUnavailability.userName}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={20} color="#6C63FF" />
                      <Text style={styles.detailText}>
                        {new Date(selectedUnavailability.date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="information-circle" size={20} color="#6C63FF" />
                      <Text style={styles.detailText}>{selectedUnavailability.reason}</Text>
                    </View>

                    {selectedUnavailability.userEmail === userEmail && (
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={() => handleDeleteUnavailability(selectedUnavailability.id)}
                      >
                        <Ionicons name="trash" size={20} color="#FFFFFF" />
                        <Text style={styles.deleteButtonText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  headerSection: {
    backgroundColor: '#6C63FF',
    padding: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E8E6FF',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionSection: {
    padding: 20,
    marginTop: -15,
  },
  addButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
  },
  listContainer: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
  unavailabilityList: {
    gap: 10,
  },
  unavailabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  unavailabilityItemContent: {
    flex: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  dateInputText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 10,
  },
  reasonInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    fontSize: 16,
    color: '#333333',
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 10,
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default Availability;
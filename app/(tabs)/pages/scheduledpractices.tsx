import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  SafeAreaView, 
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Get device dimensions
const { width, height } = Dimensions.get("window");

// Define interfaces
interface ScheduleItem {
  id: string;
  location: string;
  dateTime: string;
  specialNotes?: string;
  createdAt: Date;
}

const ScheduledPractices = () => {
  const [bandId, setBandId] = useState<string>("");
  const [bandName, setBandName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<ScheduleItem[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleItem | null>(null);
  const [filter, setFilter] = useState<string>("upcoming"); // "upcoming", "past", "all"
  
  const navigation = useNavigation();

  // Get band information on component mount
  useEffect(() => {
    const fetchBandData = async () => {
      try {
        const storedBandName = await AsyncStorage.getItem("bandName");
        
        if (storedBandName) {
          setBandName(storedBandName);
          
          // Get band ID from the band name
          const bandQuery = query(
            collection(db, "bands"),
            where("bandName", "==", storedBandName)
          );
          
          const bandSnapshot = await getDocs(bandQuery);
          
          if (!bandSnapshot.empty) {
            setBandId(bandSnapshot.docs[0].id);
          } else {
            throw new Error("Band not found");
          }
        } else {
          throw new Error("Band name not found in storage");
        }
      } catch (error) {
        console.error("Error fetching band data:", error);
        Alert.alert("Error", "Failed to load band information");
      }
    };

    fetchBandData();
  }, []);

  // Fetch schedules when bandId changes
  useEffect(() => {
    if (bandId) {
      fetchSchedules();
    }
  }, [bandId]);

  // Apply filter whenever filter or schedules change
  useEffect(() => {
    applyFilter();
  }, [filter, schedules]);

  // Fetch schedules from Firestore
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      
      const schedulesCollection = collection(db, `bands/${bandId}/schedules`);
      const scheduleSnapshot = await getDocs(schedulesCollection);
      
      const scheduleList = scheduleSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ScheduleItem[];
      
      // Sort by date (newest first)
      scheduleList.sort((a, b) => 
        new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      );
      
      setSchedules(scheduleList);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      Alert.alert("Error", "Failed to load scheduled practices");
    } finally {
      setLoading(false);
    }
  };

  // Apply filter to schedules
  const applyFilter = () => {
    const now = new Date();
    
    switch (filter) {
      case "upcoming":
        setFilteredSchedules(
          schedules.filter(item => new Date(item.dateTime) >= now)
        );
        break;
      case "past":
        setFilteredSchedules(
          schedules.filter(item => new Date(item.dateTime) < now)
        );
        break;
      case "all":
      default:
        setFilteredSchedules([...schedules]);
        break;
    }
  };

  // Show practice details in modal
  const showPracticeDetails = (item: ScheduleItem) => {
    setSelectedEvent(item);
    setModalVisible(true);
  };

  // Delete a scheduled practice
  const handleDeleteSchedule = async (scheduleId: string) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this practice session?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteDoc(doc(db, `bands/${bandId}/schedules`, scheduleId));
              
              // Update local state after deletion
              setSchedules(current => 
                current.filter(item => item.id !== scheduleId)
              );
              
              setModalVisible(false);
              Alert.alert("Success", "Practice session deleted successfully");
            } catch (error) {
              console.error("Error deleting schedule:", error);
              Alert.alert("Error", "Failed to delete practice session");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Check if a practice session is in the past
  const isPastPractice = (dateString: string) => {
    const practiceDate = new Date(dateString);
    const now = new Date();
    return practiceDate < now;
  };

  // Render individual practice item
  const renderPracticeItem = ({ item }: { item: ScheduleItem }) => {
    const isPast = isPastPractice(item.dateTime);
    
    return (
      <TouchableOpacity 
        style={[styles.practiceCard, isPast && styles.pastPracticeCard]} 
        onPress={() => showPracticeDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.practiceCardLeft}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.dateTime)}</Text>
            <Text style={styles.timeText}>{formatTime(item.dateTime)}</Text>
          </View>
        </View>
        
        <View style={styles.practiceCardRight}>
          <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
          {item.specialNotes ? (
            <Text style={styles.notesPreview} numberOfLines={1}>
              {item.specialNotes}
            </Text>
          ) : null}
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusIndicator, 
              isPast ? styles.pastIndicator : styles.upcomingIndicator
            ]} />
            <Text style={styles.statusText}>
              {isPast ? "Completed" : "Upcoming"}
            </Text>
          </View>
        </View>
        
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state if no practices
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No practices scheduled</Text>
      <Text style={styles.emptySubtext}>
        {filter === "upcoming" 
          ? "No upcoming practices found"
          : filter === "past" 
            ? "No past practices found" 
            : "No practice sessions found"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={["#3A2DBB", "#5046E5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View>
            <Text style={styles.headerTitle}>Scheduled Practices</Text>
            <Text style={styles.headerSubtitle}>{bandName}</Text>
          </View>
        </View>
      </LinearGradient>
      
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterTab, filter === "upcoming" && styles.activeFilterTab]} 
          onPress={() => setFilter("upcoming")}
        >
          <Text style={[styles.filterText, filter === "upcoming" && styles.activeFilterText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterTab, filter === "past" && styles.activeFilterTab]} 
          onPress={() => setFilter("past")}
        >
          <Text style={[styles.filterText, filter === "past" && styles.activeFilterText]}>
            Past
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterTab, filter === "all" && styles.activeFilterTab]} 
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.filterText, filter === "all" && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Practice List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5046E5" />
          <Text style={styles.loadingText}>Loading practices...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSchedules}
          renderItem={renderPracticeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Practice Details</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedEvent && (
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="calendar" size={22} color="#5046E5" />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedEvent.dateTime)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="time" size={22} color="#5046E5" />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>
                      {formatTime(selectedEvent.dateTime)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="location" size={22} color="#5046E5" />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{selectedEvent.location}</Text>
                  </View>
                </View>
                
                {selectedEvent.specialNotes ? (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons name="document-text" size={22} color="#5046E5" />
                    </View>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailValue}>
                        {selectedEvent.specialNotes}
                      </Text>
                    </View>
                  </View>
                ) : null}
                
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="information-circle" size={22} color="#5046E5" />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View style={styles.statusDetailContainer}>
                      <View style={[
                        styles.statusIndicator, 
                        isPastPractice(selectedEvent.dateTime) 
                          ? styles.pastIndicator 
                          : styles.upcomingIndicator
                      ]} />
                      <Text style={[
                        styles.statusDetailText, 
                        isPastPractice(selectedEvent.dateTime) 
                          ? styles.pastStatusText 
                          : styles.upcomingStatusText
                      ]}>
                        {isPastPractice(selectedEvent.dateTime) 
                          ? "Completed" 
                          : "Upcoming"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => selectedEvent && handleDeleteSchedule(selectedEvent.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete Practice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },
  header: {
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activeFilterTab: {
    backgroundColor: "#5046E5",
    borderRadius: 12,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  activeFilterText: {
    color: "#fff",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  practiceCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pastPracticeCard: {
    backgroundColor: "#F8F9FC",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  practiceCardLeft: {
    marginRight: 16,
  },
  dateContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 65,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  timeText: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  practiceCardRight: {
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  notesPreview: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  upcomingIndicator: {
    backgroundColor: "#4CAF50",
  },
  pastIndicator: {
    backgroundColor: "#9E9E9E",
  },
  statusText: {
    fontSize: 12,
    color: "#666",
  },
  arrowContainer: {
    justifyContent: "center",
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: height * 0.15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    maxWidth: "80%",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 36,
    paddingHorizontal: 24,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  detailsContainer: {
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(80, 70, 229, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  detailTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 4,
  },
  statusDetailContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusDetailText: {
    fontSize: 15,
    fontWeight: "600",
  },
  upcomingStatusText: {
    color: "#4CAF50",
  },
  pastStatusText: {
    color: "#9E9E9E",
  },
  deleteButton: {
    flexDirection: "row",
    backgroundColor: "#FF5252",
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default ScheduledPractices;
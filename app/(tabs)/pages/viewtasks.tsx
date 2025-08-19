import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Platform,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  status: "Pending" | "In Progress" | "Completed";
  assignedTo: string[];
  relatedTo: "Event" | "Practice" | "General";
  attachments?: string[];
  createdAt: Date;
}

const ViewTasks = () => {
  const [bandId, setBandId] = useState<string | null>(null);
  const [bandName, setBandName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterDueDate, setFilterDueDate] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);
  
  // Task detail modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchUserAndBandData();
  }, []);

  // Apply filters and sorting when tasks or filter options change
  useEffect(() => {
    if (tasks.length > 0) {
      applyFiltersAndSort();
    }
  }, [tasks, filterStatus, filterDueDate, sortBy, sortDirection, searchQuery]);

  const fetchUserAndBandData = async () => {
    try {
      const storedBandName = await AsyncStorage.getItem("bandName");
      const storedUserEmail = await AsyncStorage.getItem("userEmail");

      if (storedBandName && storedUserEmail) {
        setBandName(storedBandName);
        setUserEmail(storedUserEmail);

        // Fetch band ID based on band name
        const bandQuery = query(
          collection(db, "bands"),
          where("bandName", "==", storedBandName)
        );
        const bandSnapshot = await getDocs(bandQuery);

        if (!bandSnapshot.empty) {
          const bandDoc = bandSnapshot.docs[0];
          const bandDocId = bandDoc.id;
          setBandId(bandDocId);

          // Fetch user ID based on email
          const usersQuery = query(
            collection(db, `bands/${bandDocId}/users`),
            where("email", "==", storedUserEmail)
          );
          const usersSnapshot = await getDocs(usersQuery);

          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            setUserId(userDoc.id);
            
            // Now fetch tasks assigned to this user
            await fetchMyTasks(bandDocId, userDoc.id);
          } else {
            Alert.alert("Error", "User not found in this band");
            setLoading(false);
          }
        } else {
          Alert.alert("Error", "Band not found");
          setLoading(false);
        }
      } else {
        Alert.alert("Error", "User or band information not found");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching user and band data:", error);
      Alert.alert("Error", "Failed to fetch user and band data");
      setLoading(false);
    }
  };

  const fetchMyTasks = async (bandDocId: string, userId: string) => {
    try {
      setLoading(true);
      const tasksQuery = collection(db, `bands/${bandDocId}/tasks`);
      const tasksSnapshot = await getDocs(tasksQuery);

      const taskList = tasksSnapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            dueDate: data.dueDate?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
          };
        })
        .filter((task) => task.assignedTo && task.assignedTo.includes(userId)) as Task[];

      setTasks(taskList);
      setFilteredTasks(taskList);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      Alert.alert("Error", "Failed to fetch your tasks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshTasks = async () => {
    setRefreshing(true);
    if (bandId && userId) {
      await fetchMyTasks(bandId, userId);
    }
    setRefreshing(false);
  };

  const applyFiltersAndSort = () => {
    let result = [...tasks];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus !== "All") {
      result = result.filter((task) => task.status === filterStatus);
    }

    // Apply due date filter
    if (filterDueDate !== "All") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      switch (filterDueDate) {
        case "Today":
          result = result.filter((task) => {
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === today.getTime();
          });
          break;
        case "Tomorrow":
          result = result.filter((task) => {
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === tomorrow.getTime();
          });
          break;
        case "ThisWeek":
          result = result.filter((task) => {
            const taskDate = new Date(task.dueDate);
            return taskDate >= today && taskDate <= nextWeek;
          });
          break;
        case "Overdue":
          result = result.filter((task) => {
            const taskDate = new Date(task.dueDate);
            return taskDate < today && task.status !== "Completed";
          });
          break;
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === "dueDate") {
        return sortDirection === "asc"
          ? a.dueDate.getTime() - b.dueDate.getTime()
          : b.dueDate.getTime() - a.dueDate.getTime();
      } else if (sortBy === "status") {
        const statusOrder = { Completed: 3, "In Progress": 2, Pending: 1 };
        const statusA = statusOrder[a.status] || 0;
        const statusB = statusOrder[b.status] || 0;
        return sortDirection === "asc"
          ? statusA - statusB
          : statusB - statusA;
      } else if (sortBy === "title") {
        return sortDirection === "asc"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      } else {
        return 0;
      }
    });

    setFilteredTasks(result);
  };

  const updateTaskStatus = async (taskId: string, newStatus: "Pending" | "In Progress" | "Completed") => {
    if (!bandId) {
      Alert.alert("Error", "Band ID not found");
      return;
    }

    try {
      const taskRef = doc(db, `bands/${bandId}/tasks`, taskId);
      await updateDoc(taskRef, { status: newStatus });
      
      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
      
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, status: newStatus });
      }
      
      Alert.alert("Success", "Task status updated successfully!");
    } catch (error) {
      console.error("Error updating task status:", error);
      Alert.alert("Error", "Failed to update task status");
    }
  };

  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "#66cc66";
      case "In Progress":
        return "#ffcc00";
      case "Pending":
        return "#ff9999";
      default:
        return "#ff9999";
    }
  };

  const getRelatedIcon = (relatedTo: string) => {
    switch (relatedTo) {
      case "Event":
        return <FontAwesome5 name="calendar-alt" size={16} color="#6C63FF" />;
      case "Practice":
        return <FontAwesome5 name="guitar" size={16} color="#6C63FF" />;
      case "General":
        return <FontAwesome5 name="tasks" size={16} color="#6C63FF" />;
      default:
        return <FontAwesome5 name="tasks" size={16} color="#6C63FF" />;
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const isOverdue = new Date(item.dueDate) < new Date() && item.status !== "Completed";

    return (
      <TouchableOpacity 
        style={[
          styles.taskItem,
          isOverdue && styles.overdueTask
        ]} 
        onPress={() => handleTaskPress(item)}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            {getRelatedIcon(item.relatedTo)}
            <Text style={styles.taskTitle} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <Text style={styles.taskDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.taskFooter}>
          <View style={styles.taskDueDate}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={[
              styles.dueDateText,
              isOverdue && styles.overdueDateText
            ]}>
              {formatDate(item.dueDate)}
              {isOverdue && " (Overdue)"}
            </Text>
          </View>
          
          {item.attachments && item.attachments.length > 0 && (
            <View style={styles.attachmentIndicator}>
              <Ionicons name="attach" size={14} color="#666" />
              <Text style={styles.attachmentText}>{item.attachments.length}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: "My Tasks",
          headerStyle: {
            backgroundColor: "#6C63FF",
          },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }} 
      />

      {/* Search and filter bar */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#A0A0A0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#A0A0A0"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearch}>
              <Ionicons name="close-circle" size={20} color="#A0A0A0" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={22} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Filter by Status</Text>
            <View style={styles.filterOptions}>
              {["All", "Pending", "In Progress", "Completed"].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    filterStatus === status && styles.activeFilterChip,
                  ]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterStatus === status && styles.activeFilterChipText,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Filter by Due Date</Text>
            <View style={styles.filterOptions}>
              {["All", "Today", "Tomorrow", "ThisWeek", "Overdue"].map((date) => (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.filterChip,
                    filterDueDate === date && styles.activeFilterChip,
                  ]}
                  onPress={() => setFilterDueDate(date)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterDueDate === date && styles.activeFilterChipText,
                    ]}
                  >
                    {date === "ThisWeek" ? "This Week" : date}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Sort By</Text>
            <View style={styles.filterOptions}>
              {[
                { key: "dueDate", label: "Due Date" },
                { key: "status", label: "Status" },
                { key: "title", label: "Title" },
              ].map((sort) => (
                <TouchableOpacity
                  key={sort.key}
                  style={[
                    styles.filterChip,
                    sortBy === sort.key && styles.activeFilterChip,
                  ]}
                  onPress={() => {
                    if (sortBy === sort.key) {
                      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy(sort.key);
                      setSortDirection("asc");
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      sortBy === sort.key && styles.activeFilterChipText,
                    ]}
                  >
                    {sort.label}
                    {sortBy === sort.key && (
                      <Text>
                        {" "}
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </Text>
                    )}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Task list */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loaderText}>Loading your tasks...</Text>
        </View>
      ) : filteredTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="assignment" size={80} color="#DDDDDD" />
          <Text style={styles.emptyText}>No tasks found</Text>
          <Text style={styles.emptySubText}>
            {searchQuery || filterStatus !== "All" || filterDueDate !== "All"
              ? "Try changing your filters"
              : "You don't have any tasks assigned yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.taskList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshTasks} colors={["#6C63FF"]} />
          }
        />
      )}

      {/* Task Detail Modal */}
      <Modal
        visible={showTaskDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTaskDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTask && (
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedTask.title}</Text>
                  <TouchableOpacity
                    onPress={() => setShowTaskDetail(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.taskDetailSection}>
                  <Text style={styles.sectionLabel}>Description</Text>
                  <Text style={styles.sectionContent}>{selectedTask.description}</Text>
                </View>

                <View style={styles.taskDetailSection}>
                  <Text style={styles.sectionLabel}>Status</Text>
                  <View style={styles.statusUpdateContainer}>
                    {["Pending", "In Progress", "Completed"].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusButton,
                          {
                            backgroundColor:
                              selectedTask.status === status
                                ? getStatusColor(status)
                                : "#F0F0F0",
                          },
                        ]}
                        onPress={() => updateTaskStatus(selectedTask.id, status as "Pending" | "In Progress" | "Completed")}
                      >
                        <Text
                          style={[
                            styles.statusButtonText,
                            {
                              color:
                                selectedTask.status === status ? "#FFFFFF" : "#333333",
                            },
                          ]}
                        >
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.taskDetailSection}>
                  <Text style={styles.sectionLabel}>Due Date</Text>
                  <Text style={styles.sectionContent}>
                    {formatDateTime(selectedTask.dueDate)}
                  </Text>
                </View>

                <View style={styles.taskDetailSection}>
                  <Text style={styles.sectionLabel}>Related To</Text>
                  <View style={styles.relatedToTag}>
                    {getRelatedIcon(selectedTask.relatedTo)}
                    <Text style={styles.relatedToText}>{selectedTask.relatedTo}</Text>
                  </View>
                </View>

                {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                  <View style={styles.taskDetailSection}>
                    <Text style={styles.sectionLabel}>Attachments</Text>
                    <View style={styles.attachmentList}>
                      {selectedTask.attachments.map((url, index) => (
                        <TouchableOpacity key={index} style={styles.attachmentItem}>
                          <Ionicons name="document-text-outline" size={20} color="#6C63FF" />
                          <Text style={styles.attachmentName}>
                            {`File ${index + 1}`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  searchFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#333333",
  },
  clearSearch: {
    padding: 4,
  },
  filterButton: {
    padding: 8,
    marginLeft: 12,
  },
  filterPanel: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  filterSection: {
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333333",
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilterChip: {
    backgroundColor: "#6C63FF",
  },
  filterChipText: {
    fontSize: 14,
    color: "#555555",
  },
  activeFilterChipText: {
    color: "#FFFFFF",
  },
  taskList: {
    padding: 16,
  },
  taskItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  overdueTask: {
    borderLeftWidth: 4,
    borderLeftColor: "#ff4d4d",
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  taskTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  taskDescription: {
    fontSize: 14,
    color: "#555555",
    marginBottom: 12,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskDueDate: {
    flexDirection: "row",
    alignItems: "center",
  },
  dueDateText: {
    fontSize: 12,
    color: "#666666",
    marginLeft: 4,
  },
  overdueDateText: {
    color: "#ff4d4d",
    fontWeight: "500",
  },
  attachmentIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  attachmentText: {
    fontSize: 12,
    color: "#666666",
    marginLeft: 4,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666666",
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999999",
    marginTop: 8,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333333",
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  taskDetailSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 6,
  },
  sectionContent: {
    fontSize: 16,
    color: "#333333",
    lineHeight: 22,
  },
  statusUpdateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statusButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  relatedToTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  relatedToText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333333",
    fontWeight: "500",
  },
  attachmentList: {
    marginTop: 4,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  attachmentName: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333333",
  },
});

export default ViewTasks;
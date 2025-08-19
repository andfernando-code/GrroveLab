import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface FilterOptions {
  assignee: string;
  dateRange: string;
  groupBy: "None" | "Event" | "Member";
}

const AssignTasks = () => {
  const navigation = useNavigation();
  const storage = getStorage();

  // Band details
  const [bandId, setBandId] = useState<string | null>(null);
  const [bandName, setBandName] = useState("");

  // Task form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(new Date());
  const [status, setStatus] = useState<"Pending" | "In Progress" | "Completed">(
    "Pending"
  );
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [relatedTo, setRelatedTo] = useState<"Event" | "Practice" | "General">(
    "General"
  );
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Tab state
  const [activeTab, setActiveTab] = useState<"Pending" | "In Progress" | "Completed">("Pending");

  // Filter state (removed status filter since we're using tabs)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    assignee: "All",
    dateRange: "All",
    groupBy: "None",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch band details on component mount
  useEffect(() => {
    const fetchBandDetails = async () => {
      try {
        const storedBandName = await AsyncStorage.getItem("bandName");
        if (storedBandName) {
          setBandName(storedBandName);

          // Fetch band ID based on stored band name
          const bandQuery = query(
            collection(db, "bands"),
            where("bandName", "==", storedBandName)
          );
          const bandSnapshot = await getDocs(bandQuery);

          if (!bandSnapshot.empty) {
            const bandDoc = bandSnapshot.docs[0];
            setBandId(bandDoc.id);
          } else {
            Alert.alert("Error", "Band not found in database");
          }
        } else {
          Alert.alert("Error", "Band name not found in local storage");
        }
      } catch (error) {
        console.error("Error fetching band details:", error);
        Alert.alert("Error", "Failed to fetch band details");
      }
    };

    fetchBandDetails();
  }, []);

  // Fetch tasks and members when bandId is available
  useEffect(() => {
    if (bandId) {
      fetchTasks();
      fetchMembers();
    }
  }, [bandId]);

  // Fetch all tasks for the band
  const fetchTasks = async () => {
    if (!bandId) return;

    try {
      setLoading(true);
      const tasksQuery = collection(db, `bands/${bandId}/tasks`);
      const tasksSnapshot = await getDocs(tasksQuery);

      const taskList = tasksSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dueDate: data.dueDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      }) as Task[];

      setTasks(taskList);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      Alert.alert("Error", "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all band members
  const fetchMembers = async () => {
    if (!bandId) return;

    try {
      const usersQuery = collection(db, `bands/${bandId}/users`);
      const usersSnapshot = await getDocs(usersQuery);

      const userList = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        email: doc.data().email,
        role: doc.data().role,
      })) as Member[];

      setMembers(userList);
    } catch (error) {
      console.error("Error fetching members:", error);
      Alert.alert("Error", "Failed to fetch band members");
    }
  };

  // Handle file picking for attachments
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf", "audio/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false) {
        const selectedFiles = result.assets;
        if (selectedFiles && selectedFiles.length > 0) {
          // Store the selected file URIs
          const newAttachments = selectedFiles.map((file) => file.uri);
          setAttachments([...attachments, ...newAttachments]);
        }
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document");
    }
  };

  // Upload files to Firebase Storage
  const uploadFiles = async () => {
    if (!attachments.length) return [];

    const uploadPromises = attachments.map(async (uri) => {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();

        // Generate a unique filename
        const filename = uri.substring(uri.lastIndexOf("/") + 1);
        const storageRef = ref(
          storage,
          `bands/${bandId}/tasks/${Date.now()}_${filename}`
        );

        // Upload the file
        const snapshot = await uploadBytes(storageRef, blob);

        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
      } catch (error) {
        console.error("Error uploading file:", error);
        return null;
      }
    });

    const urls = await Promise.all(uploadPromises);
    return urls.filter((url) => url !== null) as string[];
  };

  // Handle task creation or update
  const handleSaveTask = async () => {
    if (!title || !description || !dueDate || !assignedTo.length) {
      Alert.alert(
        "Error",
        "Please fill all required fields and assign to at least one member"
      );
      return;
    }

    if (!bandId) {
      Alert.alert("Error", "Band details not found. Try again later.");
      return;
    }

    try {
      setLoading(true);

      // Upload attachments if any
      let fileUrls: string[] = [];
      if (attachments.length > 0) {
        fileUrls = await uploadFiles();
      }

      // Combine previous attachments (if editing) with new uploads
      const allAttachments = editingTask
        ? [...(editingTask.attachments || []), ...fileUrls]
        : fileUrls;

      const taskData = {
        title,
        description,
        dueDate,
        status,
        assignedTo,
        relatedTo,
        attachments: allAttachments,
        createdAt: editingTask ? editingTask.createdAt : new Date(),
        updatedAt: new Date(),
        bandId,
        bandName,
      };

      if (editingTask) {
        // Update existing task
        await updateDoc(
          doc(db, `bands/${bandId}/tasks`, editingTask.id),
          taskData
        );
        Alert.alert("Success", "Task updated successfully!");
      } else {
        // Create new task
        await addDoc(collection(db, `bands/${bandId}/tasks`), taskData);
        Alert.alert("Success", "Task created successfully!");
      }

      // Reset form and refresh tasks
      resetForm();
      fetchTasks();
      setShowTaskModal(false);
    } catch (error) {
      console.error("Error saving task:", error);
      Alert.alert("Error", "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    if (!bandId) {
      Alert.alert("Error", "Band ID not found");
      return;
    }

    Alert.alert("Confirm", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, `bands/${bandId}/tasks`, taskId));
            Alert.alert("Success", "Task deleted successfully!");
            fetchTasks();
          } catch (error) {
            console.error("Error deleting task:", error);
            Alert.alert("Error", "Failed to delete task");
          }
        },
      },
    ]);
  };

  // Update task status
  const handleUpdateStatus = async (taskId: string, newStatus: "Pending" | "In Progress" | "Completed") => {
    if (!bandId) {
      Alert.alert("Error", "Band ID not found");
      return;
    }

    try {
      await updateDoc(doc(db, `bands/${bandId}/tasks`, taskId), { 
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
      
      Alert.alert("Success", "Task status updated successfully!");
    } catch (error) {
      console.error("Error updating task status:", error);
      Alert.alert("Error", "Failed to update task status");
    }
  };

  // Open task modal for editing
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setDueDate(task.dueDate);
    setStatus(task.status);
    setAssignedTo(task.assignedTo);
    setRelatedTo(task.relatedTo);
    setAttachmentUrls(task.attachments || []);
    setAttachments([]);
    setShowTaskModal(true);
  };

  // Reset form fields
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate(new Date());
    setStatus("Pending");
    setAssignedTo([]);
    setRelatedTo("General");
    setAttachments([]);
    setAttachmentUrls([]);
    setEditingTask(null);
  };

  // Handle member selection
  const toggleMemberSelection = (memberId: string) => {
    if (assignedTo.includes(memberId)) {
      setAssignedTo(assignedTo.filter((id) => id !== memberId));
    } else {
      setAssignedTo([...assignedTo, memberId]);
    }
  };

  // Filter tasks based on active tab and filter options
  const getFilteredTasks = () => {
    let filtered = tasks.filter(task => task.status === activeTab);

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query)
      );
    }

    // Apply assignee filter
    if (filterOptions.assignee !== "All") {
      filtered = filtered.filter((task) =>
        task.assignedTo.includes(filterOptions.assignee)
      );
    }

    // Apply date range filter
    if (filterOptions.dateRange !== "All") {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      switch (filterOptions.dateRange) {
        case "Today":
          filtered = filtered.filter((task) => {
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === today.toDateString();
          });
          break;
        case "Tomorrow":
          filtered = filtered.filter((task) => {
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === tomorrow.toDateString();
          });
          break;
        case "This Week":
          filtered = filtered.filter((task) => {
            const taskDate = new Date(task.dueDate);
            return taskDate >= today && taskDate <= nextWeek;
          });
          break;
        case "Overdue":
          filtered = filtered.filter((task) => {
            const taskDate = new Date(task.dueDate);
            return taskDate < today && task.status !== "Completed";
          });
          break;
      }
    }

    return filtered;
  };

  // Group tasks by specified criteria
  const getGroupedTasks = () => {
    const filteredTasks = getFilteredTasks();

    if (filterOptions.groupBy === "None") {
      return { "All Tasks": filteredTasks };
    }

    if (filterOptions.groupBy === "Event") {
      return filteredTasks.reduce((groups, task) => {
        const key = task.relatedTo;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(task);
        return groups;
      }, {} as Record<string, Task[]>);
    }

    if (filterOptions.groupBy === "Member") {
      const memberGroups: Record<string, Task[]> = {};

      filteredTasks.forEach((task) => {
        task.assignedTo.forEach((memberId) => {
          const member = members.find((m) => m.id === memberId);
          const memberName = member ? member.name : "Unknown Member";

          if (!memberGroups[memberName]) {
            memberGroups[memberName] = [];
          }

          if (!memberGroups[memberName].find((t) => t.id === task.id)) {
            memberGroups[memberName].push(task);
          }
        });
      });

      return memberGroups;
    }

    return { "All Tasks": filteredTasks };
  };

  // Format date to readable string
  const formatDate = (date: Date) => {
    if (!date) return ""; // Handle null or undefined dates
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleDateString("en-US", options);
  };

  // Get member name by ID
  const getMemberNames = (memberIds: string[]) => {
    return memberIds
      .map((id) => {
        const member = members.find((m) => m.id === id);
        return member ? member.name : "Unknown";
      })
      .join(", ");
  };

  // Get status color
  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
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

  // Function to handle attachment download (basic - needs further implementation based on your needs)
  const handleDownloadAttachment = (urls: string[]) => {
    urls.forEach(url => {
      // Implement download logic here.  
      // For web, you can use: window.open(url, '_blank');
      // For mobile, you'll need a file system library (e.g., react-native-fs) 
      console.log("Download URL:", url);
      Alert.alert("Download", "Download functionality needs further implementation for mobile.");
    });
  };

  // Get task count for each tab
  const getTaskCount = (status: "Pending" | "In Progress" | "Completed") => {
    return tasks.filter(task => task.status === status).length;
  };

  // Render task item
  const renderTaskItem = ({ item }: { item: Task }) => {
    const isOverdue = new Date(item.dueDate) < new Date() && item.status !== "Completed";
    
    return (
      <View style={[styles.taskItem, isOverdue && styles.overdueTask]} key={item.id}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{item.title}</Text>
        </View>

        <Text style={styles.taskDescription}>{item.description}</Text>

        <View style={styles.taskInfoRow}>
          <Text style={styles.taskLabel}>Due: </Text>
          <Text style={[styles.taskValue, isOverdue && styles.overdueDateText]}>
            {formatDate(item.dueDate)}
            {isOverdue && " (Overdue)"}
          </Text>
        </View>

        <View style={styles.taskInfoRow}>
          <Text style={styles.taskLabel}>Assigned to: </Text>
          <Text style={styles.taskValue}>{getMemberNames(item.assignedTo)}</Text>
        </View>

        <View style={styles.taskInfoRow}>
          <Text style={styles.taskLabel}>Related to: </Text>
          <Text style={styles.taskValue}>{item.relatedTo}</Text>
        </View>

        {item.attachments && item.attachments.length > 0 && (
          <View style={styles.taskInfoRow}>
            <Text style={styles.taskLabel}>Attachments: </Text>
            <TouchableOpacity onPress={() => handleDownloadAttachment(item.attachments || [])}>
              <Text style={styles.taskValue}>
                {item.attachments.length} file(s)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status change buttons for non-current status */}
        <View style={styles.statusActions}>
          {activeTab !== "Pending" && (
            <TouchableOpacity
              onPress={() => handleUpdateStatus(item.id, "Pending")}
              style={[styles.statusButton, { backgroundColor: getStatusColor("Pending") }]}
            >
              <Text style={styles.statusButtonText}>Mark Pending</Text>
            </TouchableOpacity>
          )}
          
          {activeTab !== "In Progress" && (
            <TouchableOpacity
              onPress={() => handleUpdateStatus(item.id, "In Progress")}
              style={[styles.statusButton, { backgroundColor: getStatusColor("In Progress") }]}
            >
              <Text style={styles.statusButtonText}>Mark In Progress</Text>
            </TouchableOpacity>
          )}
          
          {activeTab !== "Completed" && (
            <TouchableOpacity
              onPress={() => handleUpdateStatus(item.id, "Completed")}
              style={[styles.statusButton, { backgroundColor: getStatusColor("Completed") }]}
            >
              <Text style={styles.statusButtonText}>Mark Complete</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.taskActions}>
          <TouchableOpacity
            onPress={() => handleEditTask(item)}
            style={[styles.actionButton, styles.editButton]}
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDeleteTask(item.id)}
            style={[styles.actionButton, styles.deleteButton]}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render group header
  const renderGroupHeader = (title: string) => (
    <View style={styles.groupHeader} key={title}>
      <Text style={styles.groupTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Task Management</Text>

      {/* Search and Filter Bar */}
      <View style={styles.searchFilterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="gray"
        />

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowTaskModal(true);
          }}
        >
          <Text style={styles.addButtonText}>+ New Task</Text>
        </TouchableOpacity>
      </View>

      {/* Status Tabs */}
      <View style={styles.tabContainer}>
        {(["Pending", "In Progress", "Completed"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.activeTabText
            ]}>
              {tab}
            </Text>
            <Text style={[
              styles.tabCount,
              activeTab === tab && styles.activeTabCount
            ]}>
              {getTaskCount(tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Assignee:</Text>
            <View style={styles.filterPicker}>
              <Picker
                selectedValue={filterOptions.assignee}
                onValueChange={(value) =>
                  setFilterOptions({ ...filterOptions, assignee: value })
                }
                style={styles.picker}
              >
                <Picker.Item label="All" value="All" />
                {members.map((member) => (
                  <Picker.Item
                    key={member.id}
                    label={member.name}
                    value={member.id}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Date:</Text>
            <View style={styles.filterPicker}>
              <Picker
                selectedValue={filterOptions.dateRange}
                onValueChange={(value) =>
                  setFilterOptions({ ...filterOptions, dateRange: value })
                }
                style={styles.picker}
              >
                <Picker.Item label="All" value="All" />
                <Picker.Item label="Today" value="Today" />
                <Picker.Item label="Tomorrow" value="Tomorrow" />
                <Picker.Item label="This Week" value="This Week" />
                <Picker.Item label="Overdue" value="Overdue" />
              </Picker>
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Group By:</Text>
            <View style={styles.filterPicker}>
              <Picker
                selectedValue={filterOptions.groupBy}
                onValueChange={(value) =>
                  setFilterOptions({
                    ...filterOptions,
                    groupBy: value as "None" | "Event" | "Member",
                  })
                }
                style={styles.picker}
              >
                <Picker.Item label="None" value="None" />
                <Picker.Item label="Event Type" value="Event" />
                <Picker.Item label="Member" value="Member" />
              </Picker>
            </View>
          </View>
        </View>
      )}

      {/* Task List */}
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : (
        <FlatList
          data={Object.entries(getGroupedTasks())}
          renderItem={({ item }) => (
            <View key={item[0]}>
              {renderGroupHeader(item[0])}
              {item[1].length > 0 ? (
                item[1].map((task) => (
                  renderTaskItem({ item: task })
                ))
              ) : (
                <Text style={styles.noTasksText}>No {activeTab.toLowerCase()} tasks found</Text>
              )}
            </View>
          )}
          keyExtractor={(item) => item[0]} // Use the group title as the key
          style={styles.taskList}
        />
      )}

      {/* Task Modal */}
      <Modal
        visible={showTaskModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTaskModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {editingTask ? "Edit Task" : "Create New Task"}
              </Text>

              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Task title"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="gray"
              />

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Task description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholderTextColor="gray"
              />

              <Text style={styles.inputLabel}>Due Date & Time *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text>
                  {dueDate ? formatDate(dueDate) : "Select date and time"}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <>
                  <DateTimePicker
                    value={dueDate}
                    mode="datetime"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(Platform.OS === "ios");
                      if (selectedDate) {
                        setDueDate(selectedDate);
                      }
                    }}
                  />
                  {Platform.OS === "ios" && (
                    <Button
                      title="Done"
                      onPress={() => setShowDatePicker(false)}
                    />
                  )}
                </>
              )}

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={status}
                  onValueChange={(value) => setStatus(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Pending" value="Pending" />
                  <Picker.Item label="In Progress" value="In Progress" />
                  <Picker.Item label="Completed" value="Completed" />
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Related To</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={relatedTo}
                  onValueChange={(value) => setRelatedTo(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="General" value="General" />
                  <Picker.Item label="Event" value="Event" />
                  <Picker.Item label="Practice" value="Practice" />
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Assign To Members *</Text>
              <View style={styles.membersList}>
                {members.length > 0 ? (
                  members.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.memberItem,
                        assignedTo.includes(member.id) && styles.selectedMember,
                      ]}
                      onPress={() => toggleMemberSelection(member.id)}
                    >
                      <Text
                        style={[
                          styles.memberName,
                          assignedTo.includes(member.id) &&
                            styles.selectedMemberText,
                        ]}
                      >
                        {member.name} ({member.role})
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text>No members available</Text>
                )}
              </View>

              <Text style={styles.inputLabel}>Attachments</Text>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={handlePickDocument}
              >
                <Text style={styles.attachButtonText}>Select File</Text>
              </TouchableOpacity>

              {/* Display selected files */}
              {attachments.length > 0 && (
                <View style={styles.attachmentsList}>
                  <Text style={styles.attachmentsHeader}>New Attachments:</Text>{attachments.map((uri, index) => (
                    <View key={index} style={styles.attachmentItem}>
                      <Text style={styles.attachmentName}>
                        {uri.substring(uri.lastIndexOf("/") + 1)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          const newAttachments = attachments.filter((_, i) => i !== index);
                          setAttachments(newAttachments);
                        }}
                        style={styles.removeAttachmentButton}
                      >
                        <Text style={styles.removeAttachmentText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Display existing attachments when editing */}
              {editingTask && attachmentUrls.length > 0 && (
                <View style={styles.attachmentsList}>
                  <Text style={styles.attachmentsHeader}>Existing Attachments:</Text>
                  {attachmentUrls.map((url, index) => (
                    <View key={index} style={styles.attachmentItem}>
                      <Text style={styles.attachmentName}>
                        Attachment {index + 1}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDownloadAttachment([url])}
                        style={styles.downloadAttachmentButton}
                      >
                        <Text style={styles.downloadAttachmentText}>View</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    resetForm();
                    setShowTaskModal(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveTask}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingTask ? "Update Task" : "Create Task"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  searchFilterContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
    marginRight: 8,
  },
  filterButton: {
    backgroundColor: "#007bff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  filterButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "#007bff",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 2,
  },
  activeTabText: {
    color: "white",
  },
  tabCount: {
    fontSize: 12,
    color: "#999",
    fontWeight: "bold",
  },
  activeTabCount: {
    color: "white",
  },
  filterPanel: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  filterLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  filterPicker: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
  },
  picker: {
    height: 40,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  taskList: {
    flex: 1,
  },
  groupHeader: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
    borderRadius: 6,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#495057",
  },
  taskItem: {
    backgroundColor: "white",
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#007bff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  overdueTask: {
    borderLeftColor: "#dc3545",
    backgroundColor: "#fff5f5",
  },
  taskHeader: {
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  taskDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  taskInfoRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "center",
  },
  taskLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#495057",
    minWidth: 100,
  },
  taskValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  overdueDateText: {
    color: "#dc3545",
    fontWeight: "bold",
  },
  statusActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    marginBottom: 8,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  statusButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  taskActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: "#ffc107",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  noTasksText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
    marginTop: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    width: "90%",
    maxHeight: "80%",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "white",
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "white",
  },
  membersList: {
    marginBottom: 16,
    maxHeight: 200,
  },
  memberItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "white",
  },
  selectedMember: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196f3",
  },
  memberName: {
    fontSize: 14,
    color: "#333",
  },
  selectedMemberText: {
    color: "#1976d2",
    fontWeight: "500",
  },
  attachButton: {
    backgroundColor: "#6c757d",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  attachButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  attachmentsList: {
    marginBottom: 16,
  },
  attachmentsHeader: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  attachmentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    marginBottom: 4,
  },
  attachmentName: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  removeAttachmentButton: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  removeAttachmentText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  downloadAttachmentButton: {
    backgroundColor: "#007bff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  downloadAttachmentText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#6c757d",
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: "#28a745",
    marginLeft: 8,
  },
  cancelButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default AssignTasks;
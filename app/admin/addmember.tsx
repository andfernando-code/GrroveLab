import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  FlatList, 
  StyleSheet, 
  Modal,
  ScrollView,
  StatusBar,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig'; 
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  password: string;
  bandName: string;
  createdAt: Date;
}

const AddMember = () => {
  const navigation = useNavigation();

  const [bandId, setBandId] = useState<string | null>(null);
  const [bandName, setBandName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Edit modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const fetchBandDetails = async () => {
      try {
        const storedBandName = await AsyncStorage.getItem('bandName');
        if (storedBandName) {
          setBandName(storedBandName);

          const bandQuery = query(collection(db, "bands"), where("bandName", "==", storedBandName));
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

  useEffect(() => {
    if (bandId) {
      fetchMembers();
    }
  }, [bandId]);

  const fetchMembers = async () => {
    if (!bandId) return;
    
    try {
      const usersQuery = collection(db, `bands/${bandId}/users`);
      const usersSnapshot = await getDocs(usersQuery);

      const userList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Member[];

      setMembers(userList);
    } catch (error) {
      console.error("Error fetching members:", error);
      Alert.alert("Error", "Failed to fetch band members");
    }
  };

  const handleAddMember = async () => {
    if (!name || !email || !role || !password) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    if (!bandId || !bandName) {
      Alert.alert("Error", "Band details not found. Try again later.");
      return;
    }

    try {
      setLoading(true);

      const newUser = {
        name,
        email,
        role,
        password,
        bandName,
        createdAt: new Date(),
      };

      await addDoc(collection(db, `bands/${bandId}/users`), newUser);

      Alert.alert("Success", "Member added successfully!");
      setName('');
      setEmail('');
      setRole('');
      setPassword('');
      setShowAddForm(false);

      fetchMembers();
    } catch (error) {
      console.error("Error adding member:", error);
      Alert.alert("Error", "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditRole(member.role);
    setEditModalVisible(true);
  };

  const handleUpdateMember = async () => {
    if (!editName || !editEmail || !editRole) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    if (!bandId || !editingMember) {
      Alert.alert("Error", "Unable to update member");
      return;
    }

    try {
      setEditLoading(true);

      const updatedData = {
        name: editName,
        email: editEmail,
        role: editRole,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, `bands/${bandId}/users`, editingMember.id), updatedData);

      Alert.alert("Success", "Member updated successfully!");
      setEditModalVisible(false);
      fetchMembers();
    } catch (error) {
      console.error("Error updating member:", error);
      Alert.alert("Error", "Failed to update member");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!bandId) {
      Alert.alert("Error", "Band ID not found");
      return;
    }
    
    Alert.alert(
      "Remove Member", 
      `Are you sure you want to remove ${memberName} from the band?`, 
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, `bands/${bandId}/users`, memberId));
              Alert.alert("Success", "Member removed successfully!");
              fetchMembers();
            } catch (error) {
              console.error("Error deleting member:", error);
              Alert.alert("Error", "Failed to remove member");
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    const roleColors: { [key: string]: string } = {
      'Lead Singer': '#FF6B6B',
      'Guitarist': '#4ECDC4',
      'Bassist': '#45B7D1',
      'Drummer': '#96CEB4',
      'Keyboardist': '#FECA57',
      'Manager': '#6C5CE7',
      'Producer': '#A29BFE',
      'default': '#74B9FF'
    };
    return roleColors[role] || roleColors.default;
  };

  const renderMemberCard = ({ item }: { item: Member }) => (
    <TouchableOpacity 
      style={styles.memberCard}
      onPress={() => handleEditMember(item)}
      activeOpacity={0.7}
    >
      <View style={styles.memberInfo}>
        <View style={styles.memberHeader}>
          <Text style={styles.memberName}>{item.name}</Text>
          <View style={[styles.roleTag, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        </View>
        <Text style={styles.memberEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteMember(item.id, item.name)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.deleteButtonText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Band Members</Text>
          <Text style={styles.subtitle}>Manage your {bandName} team</Text>
        </View>

        {/* Add Member Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(!showAddForm)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>
            {showAddForm ? "Cancel" : "+ Add New Member"}
          </Text>
        </TouchableOpacity>

        {/* Add Member Form */}
        {showAddForm && (
          <View style={styles.addForm}>
            <Text style={styles.formTitle}>Add New Member</Text>
            <TextInput
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholderTextColor="#A0A0A0"
            />
            <TextInput
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              placeholderTextColor="#A0A0A0"
            />
            <TextInput
              placeholder="Role (e.g., Lead Singer, Guitarist)"
              value={role}
              onChangeText={setRole}
              style={styles.input}
              placeholderTextColor="#A0A0A0"
            />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
              placeholderTextColor="#A0A0A0"
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleAddMember}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Add Member</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Members List */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>
            Current Members ({members.length})
          </Text>
          
          {members.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No members added yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add your first band member to get started
              </Text>
            </View>
          ) : (
            <FlatList
              data={members}
              renderItem={renderMemberCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Edit Member Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Member</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <TextInput
                  placeholder="Full Name"
                  value={editName}
                  onChangeText={setEditName}
                  style={styles.input}
                  placeholderTextColor="#A0A0A0"
                />
                <TextInput
                  placeholder="Email Address"
                  value={editEmail}
                  onChangeText={setEditEmail}
                  style={styles.input}
                  keyboardType="email-address"
                  placeholderTextColor="#A0A0A0"
                />
                <TextInput
                  placeholder="Role"
                  value={editRole}
                  onChangeText={setEditRole}
                  style={styles.input}
                  placeholderTextColor="#A0A0A0"
                />

                <TouchableOpacity
                  style={[styles.submitButton, editLoading && styles.disabledButton]}
                  onPress={handleUpdateMember}
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Update Member</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#636E72',
    fontWeight: '400',
  },
  addButton: {
    backgroundColor: '#6C5CE7',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  addForm: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#00B894',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#B2BEC3',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  membersSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3436',
    marginRight: 12,
  },
  roleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 14,
    color: '#636E72',
    fontWeight: '400',
  },
  deleteButton: {
    backgroundColor: '#FF4757',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#A0A0A0',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: width - 40,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3436',
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#636E72',
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
});

export default AddMember;
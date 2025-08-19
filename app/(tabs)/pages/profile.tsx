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
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../FirebaseConfig';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  bio?: string;
  joinDate?: Date;
  bandName: string;
}

const Profile = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [bandName, setBandName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get user email and band name from AsyncStorage
      const userEmail = await AsyncStorage.getItem('userEmail');
      const storedBandName = await AsyncStorage.getItem('bandName');
      
      if (!userEmail || !storedBandName) {
        Alert.alert('Error', 'User details not found. Please log in again.');
        return;
      }
      
      // Find the band document
      const bandsQuery = query(collection(db, 'bands'), where('bandName', '==', storedBandName));
      const bandsSnapshot = await getDocs(bandsQuery);
      
      if (bandsSnapshot.empty) {
        Alert.alert('Error', 'Band not found');
        setLoading(false);
        return;
      }
      
      const bandDoc = bandsSnapshot.docs[0];
      const bandId = bandDoc.id;
      
      // Find the user document
      const usersQuery = query(
        collection(db, `bands/${bandId}/users`),
        where('email', '==', userEmail)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        Alert.alert('Error', 'User profile not found');
        setLoading(false);
        return;
      }
      
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data() as Omit<UserProfile, 'id'>;
      
      const profileData: UserProfile = {
        id: userDoc.id,
        name: userData.name || '',
        email: userData.email || '',
        role: userData.role || '',
        phone: userData.phone || '',
        bio: userData.bio || '',
        joinDate: userData.joinDate || new Date(),
        bandName: userData.bandName || storedBandName
      };
      
      setUserProfile(profileData);
      
      // Set form fields
      setName(profileData.name);
      setEmail(profileData.email);
      setRole(profileData.role);
      setPhone(profileData.phone || '');
      setBio(profileData.bio || '');
      setBandName(profileData.bandName);
      
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;
    
    try {
      setUpdating(true);
      
      // Get band ID
      const bandsQuery = query(collection(db, 'bands'), where('bandName', '==', bandName));
      const bandsSnapshot = await getDocs(bandsQuery);
      
      if (bandsSnapshot.empty) {
        Alert.alert('Error', 'Band not found');
        setUpdating(false);
        return;
      }
      
      const bandDoc = bandsSnapshot.docs[0];
      const bandId = bandDoc.id;
      
      // Update user document
      const userDocRef = doc(db, `bands/${bandId}/users`, userProfile.id);
      
      const updatedData = {
        name,
        role,
        phone,
        bio,
        updatedAt: new Date()
      };
      
      await updateDoc(userDocRef, updatedData);
      
      // Update local state
      setUserProfile({
        ...userProfile,
        ...updatedData
      });
      
      setEditMode(false);
      Alert.alert('Success', 'Profile updated successfully');
      
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          headerTitle: 'My Profile',
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
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
                {!editMode && (
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={toggleEditMode}
                  >
                    <Ionicons name="pencil" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
              
              <Text style={styles.bandName}>{bandName}</Text>
            </View>
            
            <View style={styles.profileCard}>
              {editMode ? (
                // Edit Mode Form
                <View style={styles.formContainer}>
                  <Text style={styles.sectionTitle}>Edit Profile</Text>
                  
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color="#A0A0A0" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Full Name"
                      placeholderTextColor="#A0A0A0"
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#A0A0A0" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, styles.disabledInput]}
                      value={email}
                      editable={false}
                    />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Ionicons name="musical-notes-outline" size={20} color="#A0A0A0" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Role"
                      placeholderTextColor="#A0A0A0"
                      value={role}
                      onChangeText={setRole}
                    />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Ionicons name="call-outline" size={20} color="#A0A0A0" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Phone Number"
                      placeholderTextColor="#A0A0A0"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                  
                  <View style={styles.bioInputContainer}>
                    <Ionicons name="information-circle-outline" size={20} color="#A0A0A0" style={styles.bioInputIcon} />
                    <TextInput
                      style={styles.bioInput}
                      placeholder="Bio"
                      placeholderTextColor="#A0A0A0"
                      value={bio}
                      onChangeText={setBio}
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                  
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={toggleEditMode}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.saveButton}
                      onPress={handleSaveProfile}
                      disabled={updating}
                    >
                      {updating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // View Mode
                <View style={styles.profileInfo}>
                  <Text style={styles.userName}>{name}</Text>
                  <Text style={styles.userRole}>{role}</Text>
                  
                  <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                      <Ionicons name="mail" size={20} color="#6C63FF" />
                      <Text style={styles.infoText}>{email}</Text>
                    </View>
                    
                    {phone && (
                      <View style={styles.infoRow}>
                        <Ionicons name="call" size={20} color="#6C63FF" />
                        <Text style={styles.infoText}>{phone}</Text>
                      </View>
                    )}
                    
                    <View style={styles.infoRow}>
                      <Ionicons name="people" size={20} color="#6C63FF" />
                      <Text style={styles.infoText}>{bandName}</Text>
                    </View>
                    
                    {bio && (
                      <View style={styles.bioSection}>
                        <Text style={styles.bioLabel}>Bio</Text>
                        <Text style={styles.bioText}>{bio}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
            
            {!editMode && (
              <View style={styles.quickActionsContainer}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                
                <View style={styles.quickActionsGrid}>
                  <TouchableOpacity style={styles.quickActionButton}>
                    <View style={styles.quickActionIcon}>
                      <Ionicons name="calendar" size={24} color="#6C63FF" />
                    </View>
                    <Text style={styles.quickActionText}>View Schedule</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.quickActionButton}>
                    <View style={styles.quickActionIcon}>
                      <FontAwesome name="music" size={24} color="#6C63FF" />
                    </View>
                    <Text style={styles.quickActionText}>My Repertoire</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.quickActionButton}>
                    <View style={styles.quickActionIcon}>
                      <Ionicons name="settings" size={24} color="#6C63FF" />
                    </View>
                    <Text style={styles.quickActionText}>Settings</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.quickActionButton}>
                    <View style={styles.quickActionIcon}>
                      <Ionicons name="help-circle" size={24} color="#6C63FF" />
                    </View>
                    <Text style={styles.quickActionText}>Help</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>GrooveLab Member Since {userProfile?.joinDate ? new Date(userProfile.joinDate).getFullYear() : 'Recent'}</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#6C63FF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#5C5C5C',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  bandName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: -30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  userRole: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  infoSection: {
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333333',
  },
  bioSection: {
    marginTop: 10,
    width: '100%',
  },
  bioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 5,
  },
  bioText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  inputIcon: {
    marginLeft: 15,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 10,
    color: '#333333',
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: '#F0F0F0',
    color: '#999999',
  },
  bioInputContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 10,
  },
  bioInputIcon: {
    marginBottom: 5,
    marginLeft: 5,
  },
  bioInput: {
    width: '100%',
    height: 100,
    paddingHorizontal: 10,
    color: '#333333',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6C63FF',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#6C63FF',
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsContainer: {
    padding: 20,
    marginTop: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
  },
  footer: {
    marginTop: 10,
    alignItems: 'center',
  },
  footerText: {
    color: '#999999',
    fontSize: 12,
  },
});

export default Profile;
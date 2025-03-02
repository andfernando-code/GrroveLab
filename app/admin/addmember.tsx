import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig'; 
import { useNavigation } from '@react-navigation/native';

const AddMember = () => {
  const navigation = useNavigation();

  const [bandId, setBandId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const fetchBandId = async () => {
      try {
        const storedBandName = await AsyncStorage.getItem('bandName');
        if (storedBandName) {
          // 🔍 Fetch band ID based on stored band name
          const bandQuery = query(collection(db, "bands"), where("bandName", "==", storedBandName));
          const bandSnapshot = await getDocs(bandQuery);

          if (!bandSnapshot.empty) {
            const bandDoc = bandSnapshot.docs[0];
            setBandId(bandDoc.id); // ✅ Store band ID
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
      fetchMembers();
    }
  }, [bandId]);

  // 🔄 Fetch all band members
  const fetchMembers = async () => {
    try {
      const usersQuery = collection(db, `bands/${bandId}/users`);
      const usersSnapshot = await getDocs(usersQuery);

      const userList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMembers(userList);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const handleAddMember = async () => {
    if (!name || !email || !role || !password) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    if (!bandId) {
      Alert.alert("Error", "Band ID not found. Try again later.");
      return;
    }

    try {
      setLoading(true);

      // ✅ Save member details in Firestore
      const newUser = {
        name,
        email,
        role,
        password, // 🔴 Hash before storing in production
        createdAt: new Date(),
      };

      await addDoc(collection(db, `bands/${bandId}/users`), newUser);

      Alert.alert("Success", "Member added successfully!");
      setName('');
      setEmail('');
      setRole('');
      setPassword('');

      fetchMembers(); // 🔄 Refresh members list
    } catch (error) {
      console.error("Error adding member:", error);
      Alert.alert("Error", "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    Alert.alert("Confirm", "Are you sure you want to remove this member?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, `bands/${bandId}/users`, memberId));
            Alert.alert("Success", "Member removed successfully!");
            fetchMembers(); // 🔄 Refresh members list
          } catch (error) {
            console.error("Error deleting member:", error);
            Alert.alert("Error", "Failed to remove member");
          }
        },
      },
    ]);
  };

  return (
    <View style={{ padding: 20, flex: 1 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: "center" }}>Manage Band Members</Text>

      {/* 🎵 Add Member Form */}
      <View style={{ alignItems: "center" }}>
        <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} placeholderTextColor="gray" />
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" placeholderTextColor="gray" />
        <TextInput placeholder="Role" value={role} onChangeText={setRole} style={styles.input} placeholderTextColor="gray" />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry placeholderTextColor="gray" />

        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Button title="Add Member" onPress={handleAddMember} />
        )}
      </View>

      <Text style={{ fontSize: 20, fontWeight: "bold", marginTop: 30, marginBottom: 10 }}>Band Members</Text>

      {/* 🎵 Display Member List */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberItem}>
            <Text style={styles.memberText}>{item.name} - {item.role}</Text>
            <TouchableOpacity onPress={() => handleDeleteMember(item.id)} style={styles.deleteButton}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

import { StyleSheet, TextStyle } from 'react-native';

const styles = StyleSheet.create({
  input: {
    width: '100%',
    height: 50,
    borderColor: '#000',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  } as TextStyle,
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  memberText: {
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: "red",
    padding: 5,
    borderRadius: 5,
  },
});

export default AddMember;

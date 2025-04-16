import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminSignIn = () => {
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [bandName, setBandName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !role || !bandName) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    try {
      setLoading(true);

      // Check if band already exists
      const bandQuery = query(collection(db, "bands"), where("bandName", "==", bandName));
      const existingBands = await getDocs(bandQuery);

      if (!existingBands.empty) {
        Alert.alert("Error", "Band name already in use!");
        setLoading(false);
        return;
      }

      // Create new band in Firestore
      const bandRef = await addDoc(collection(db, "bands"), {
        bandName,
        createdAt: new Date(),
      });

      const bandId = bandRef.id;

      // Save admin details in band collection
      const adminData = {
        name,
        email,
        password, // Hash this before storing in production
        role,
        bandName,
        createdAt: new Date(),
      };

      await addDoc(collection(db, `bands/${bandId}/admins`), adminData);
      await addDoc(collection(db, `bands/${bandId}/users`), adminData);

      await AsyncStorage.setItem('bandName', bandName);
      await AsyncStorage.setItem('bandId', bandId);

      Alert.alert("Success", "Admin registered successfully!");
      router.push("/admin/adminhome");

    } catch (error) {
      console.error("Error signing up:", error);
      Alert.alert("Error", "Failed to register admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20, flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Admin Sign-Up</Text>

      <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} placeholderTextColor="gray" />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" placeholderTextColor="gray" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry placeholderTextColor="gray" />
      <TextInput placeholder="Role" value={role} onChangeText={setRole} style={styles.input} placeholderTextColor="gray" />
      <TextInput placeholder="Band Name" value={bandName} onChangeText={setBandName} style={styles.input} placeholderTextColor="gray" />

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Sign Up" onPress={handleSignUp} />
      )}

      <Button title="Have an account?" onPress={() => { router.replace("/") }} />
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
});

export default AdminSignIn;

import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator, Image, TouchableOpacity, Platform } from 'react-native';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../FirebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';

const AdminSignIn = () => {
  const navigation = useNavigation();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [bandName, setBandName] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fixed function to pick an image using DocumentPicker
  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true
      });
      
      // Check if document was picked successfully
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Use the uri from the first asset
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Function to upload image to Firebase Storage
  const uploadImage = async (bandId: string) => {
    if (!image) return null;
    
    try {
      setUploading(true);
      
      // Create a reference to the storage location
      const imageRef = ref(storage, `bands/${bandId}/band-image`);
      
      // Convert image URI to blob
      const response = await fetch(image);
      const blob = await response.blob();
      
      // Upload blob to Firebase Storage
      await uploadBytes(imageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(imageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

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

      // Create new band in Firestore (without image URL initially)
      const bandRef = await addDoc(collection(db, "bands"), {
        bandName,
        createdAt: new Date(),
      });

      const bandId = bandRef.id; // Get unique ID

      // Upload image if available and update band document with image URL
      if (image) {
        try {
          const imageUrl = await uploadImage(bandId);
          
          // Update the band document with the image URL
          await updateDoc(doc(db, "bands", bandId), {
            imageUrl: imageUrl,
          });
        } catch (error) {
          console.error("Error uploading image:", error);
          // Continue with registration even if image upload fails
          Alert.alert("Warning", "Band created but image upload failed. You can add an image later.");
        }
      }

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

      // Store band name in AsyncStorage
      await AsyncStorage.setItem('bandName', bandName);
      await AsyncStorage.setItem('bandId', bandId);

      Alert.alert("Success", "Admin registered successfully!");

      // Redirect to Admin Home
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
      
      {/* Image picker section */}
      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {image ? (
          <Image source={{ uri: image }} style={styles.previewImage} />
        ) : (
          <Text style={styles.imagePickerText}>+ Add Band Logo</Text>
        )}
      </TouchableOpacity>

      {uploading && <ActivityIndicator size="small" color="#0000ff" style={{ marginTop: 10 }} />}

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Sign Up" onPress={handleSignUp} />
      )}

      <Button title="Have an account?" onPress={() => { router.replace("/") }} />
    </View>
  );
};

import { StyleSheet, TextStyle, ViewStyle, ImageStyle } from 'react-native';

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
  imagePicker: {
    width: '100%',
    height: 150,
    borderColor: '#000',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 5,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  imagePickerText: {
    fontSize: 16,
    color: '#555',
  } as TextStyle,
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
    resizeMode: 'cover',
  } as ImageStyle,
});

export default AdminSignIn;
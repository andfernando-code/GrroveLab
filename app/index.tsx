import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { db } from "../FirebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { router } from "expo-router";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signIn = async () => {
    try {
      // Search in all bands for a matching user
      const bandsSnapshot = await getDocs(collection(db, "bands"));
      let userFound = false;
  
      for (const bandDoc of bandsSnapshot.docs) {
        const bandId = bandDoc.id;
        const usersQuery = query(
          collection(db, `bands/${bandId}/users`),
          where("email", "==", email)
        );
        const usersSnapshot = await getDocs(usersQuery);
  
        if (!usersSnapshot.empty) {
          usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.password === password) {
              userFound = true;
              router.replace("/(tabs)/home");
            }
          });
        }
      }
  
      if (!userFound) {
        Alert.alert("Login Failed", "Incorrect email or password");
      }
    } catch (error) {
      console.error("Error signing in:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };
  
  const adminlogin = async () => {
    try {
      const bandsSnapshot = await getDocs(collection(db, "bands"));
      let adminFound = false;
      let adminBandName = "";
  
      for (const bandDoc of bandsSnapshot.docs) {
        const bandId = bandDoc.id;
        const adminsQuery = query(
          collection(db, `bands/${bandId}/admins`),
          where("email", "==", email)
        );
        const adminsSnapshot = await getDocs(adminsQuery);
  
        if (!adminsSnapshot.empty) {
          adminsSnapshot.forEach(async (doc) => {
            const adminData = doc.data();
            if (adminData.password === password) {
              adminFound = true;
              adminBandName = adminData.bandName;
  
              // ✅ Store Band Name in AsyncStorage
              await AsyncStorage.setItem("bandName", adminBandName);
  
              router.replace("/admin/adminhome");
            }
          });
        }
      }
  
      if (!adminFound) {
        Alert.alert("Login Failed", "Incorrect email or password");
      }
    } catch (error) {
      console.error("Error signing in as admin:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };
  

  const adminSignIn = () => {
    router.replace("/admin/adminsignin");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>GrooveLab</Text>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.textInput}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button_user} onPress={signIn}>
        <Text style={styles.buttonText}>Login As User</Text>
      </TouchableOpacity>
      <View>
        <TouchableOpacity style={styles.button} onPress={adminlogin}>
          <Text style={styles.buttonText}>Login As Admin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={adminSignIn}>
          <Text style={styles.buttonText}>Sign Up As Admin</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  header: {
    fontSize: 30,
    marginBottom: 10,
    fontWeight: "bold",
    color: "blue",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 40,
    color: "#1A237E",
  },
  textInput: {
    height: 50,
    width: "90%",
    backgroundColor: "#4f4f4f",
    borderColor: "#E8EAF6",
    borderWidth: 2,
    borderRadius: 15,
    marginVertical: 15,
    paddingHorizontal: 25,
    fontSize: 16,
    color: "#fff",
  },
  button: {
    width: "auto",
    marginVertical: 15,
    backgroundColor: "#5C6BC0",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  button_user : {
    width: "auto",
    marginVertical: 15,
    backgroundColor: "#000",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});

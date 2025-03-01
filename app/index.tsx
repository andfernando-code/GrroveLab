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

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signIn = async () => {
    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        Alert.alert("Login Failed", "No user found with this email");
        return;
      }

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.password === password) {
          router.replace("/(tabs)/home");
        } else {
          Alert.alert("Login Failed", "Incorrect password");
        }
      });
    } catch (error) {
      console.error("Error signing in:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const adminSignIn = async () => {
    try {
      const q = query(
        collection(db, "admins"),
        where("email", "==", email)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        Alert.alert("Login Failed", "No admin found with this email");
        return;
      }

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.password === password) {
          router.replace("/admin/adminhome");
        } else {
          Alert.alert("Login Failed", "Incorrect password");
        }
      });
    } catch (error) {
      console.error("Error signing in as admin:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
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
      <TouchableOpacity style={styles.button} onPress={signIn}>
        <Text style={styles.buttonText}>Login As User</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={adminSignIn}>
        <Text style={styles.buttonText}>Login As Admin</Text>
      </TouchableOpacity>
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
    width: "90%",
    marginVertical: 15,
    backgroundColor: "#5C6BC0",
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

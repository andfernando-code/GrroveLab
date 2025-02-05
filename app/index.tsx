import {
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import React, { useState } from "react";
import { auth } from "../FirebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { router } from "expo-router";

const index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signIn = async () => {
    try {
      const user = await signInWithEmailAndPassword(auth, email, password);
      if (user) router.replace("/(tabs)/home");
    } catch (error: any) {
      console.log(error);
      alert("Sign in failed: " + error.message);
    }
  };

  const signUp = async () => {
    try {
      const user = await createUserWithEmailAndPassword(auth, email, password);
      if (user) router.replace("/(tabs)/home");
    } catch (error: any) {
      console.log(error);
      alert("Sign in failed: " + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={{fontSize:30,marginBottom: 10, fontWeight: "bold", color: "blue"}}>GrooveLab</Text>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.textInput}
        placeholder="email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.textInput}
        placeholder="password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={signIn}>
        <Text style={styles.text}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={signUp}>
        <Text style={styles.text}>Login As Admin</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA", 
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
    shadowColor: "#9E9E9E", 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  button: {
    width: "90%",
    marginVertical: 15,
    backgroundColor: "#5C6BC0",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5C6BC0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  text: {
    color: "#FFFFFF", 
    fontSize: 18,
    fontWeight: "600",
  },
});

import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions
} from "react-native";
import { db } from "../FirebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { router, Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome, Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const signIn = async () => {
    if (!email || !password) {
      Alert.alert("Missing Information", "Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      // Search in all bands for a matching user
      const bandsSnapshot = await getDocs(collection(db, "bands"));
      let userFound = false;
  
      for (const bandDoc of bandsSnapshot.docs) {
        const bandId = bandDoc.id;
        const bandData = bandDoc.data();
        const usersQuery = query(
          collection(db, `bands/${bandId}/users`),
          where("email", "==", email)
        );
        const usersSnapshot = await getDocs(usersQuery);
  
        if (!usersSnapshot.empty) {
          usersSnapshot.forEach(async (doc) => {
            const userData = doc.data();
            if (userData.password === password) {
              userFound = true;
              
              // Store user email and band name in AsyncStorage
              await AsyncStorage.setItem("userEmail", email);
              await AsyncStorage.setItem("bandName", userData.bandName || bandData.bandName);
              
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
    } finally {
      setIsLoading(false);
    }
  };
  
  const adminLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Information", "Please enter both email and password");
      return;
    }

    setIsLoading(true);
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
  
              // Store Band Name in AsyncStorage
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
    } finally {
      setIsLoading(false);
    }
  };
  
  const adminSignIn = () => {
    router.replace("/admin/adminsignin");
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <FontAwesome name="music" size={60} color="#6C63FF" />
              </View>
              <Text style={styles.logoText}>GrooveLab</Text>
              <Text style={styles.tagline}>Manage Your Band. Unleash Your Sound.</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.welcomeText}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
              
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#A0A0A0" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Email"
                  placeholderTextColor="#A0A0A0"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#A0A0A0" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Password"
                  placeholderTextColor="#A0A0A0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeIcon}>
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={22} 
                    color="#A0A0A0" 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.forgotPasswordContainer}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={signIn}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Signing in..." : "Sign In as Band Member"}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={adminLogin}
                disabled={isLoading}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Sign In as Admin</Text>
              </TouchableOpacity>

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Need admin access? </Text>
                <TouchableOpacity onPress={adminSignIn}>
                  <Text style={styles.signupLink}>Register here</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>© 2025 GrooveLab. All rights reserved.</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: height * 0.05,
    marginBottom: height * 0.03,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F0F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 5,
  },
  tagline: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 10,
  },
  formContainer: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 25,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    marginBottom: 16,
    height: 55,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  inputIcon: {
    marginLeft: 15,
    marginRight: 10,
  },
  eyeIcon: {
    padding: 10,
    position: "absolute",
    right: 5,
  },
  textInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 10,
    color: "#333333",
    fontSize: 16,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#6C63FF",
    fontSize: 14,
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    height: 55,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: "#5C5C5C",
    borderRadius: 12,
    height: 55,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 20,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 8,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#EEEEEE",
  },
  dividerText: {
    color: "#999999",
    paddingHorizontal: 10,
    fontSize: 14,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupText: {
    color: "#666666",
    fontSize: 14,
  },
  signupLink: {
    color: "#6C63FF",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    marginTop: 20,
    marginBottom: 10,
  },
  footerText: {
    color: "#999999",
    fontSize: 12,
  }
});
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../FirebaseConfig"; // Ensure Firebase is properly configured
import { IconSymbol } from "@/app-example/components/ui/IconSymbol.ios";
import { router } from "expo-router";

const AdminHome = () => {
  const [bandName, setBandName] = useState("");
  const [bandId, setBandId] = useState(null);
  const [totalMembers, setTotalMembers] = useState(0);

  useEffect(() => {
    const fetchBandData = async () => {
      try {
        const storedBandName = await AsyncStorage.getItem("bandName");
        if (storedBandName) {
          setBandName(storedBandName);

          // Fetch bandId from Firestore
          const bandQuery = query(
            collection(db, "bands"),
            where("bandName", "==", storedBandName)
          );
          const bandSnapshot = await getDocs(bandQuery);

          if (!bandSnapshot.empty) {
            const bandDoc = bandSnapshot.docs[0];
            const bandId = bandDoc.id;
            setBandId(bandId);

            // Fetch total members
            const membersCollection = collection(db, `bands/${bandId}/users`);
            const membersSnapshot = await getDocs(membersCollection);
            setTotalMembers(membersSnapshot.size);
          }
        }
      } catch (error) {
        console.error("Error fetching band data:", error);
      }
    };

    fetchBandData();
  }, []);

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        {/* Enhanced Admin Panel with decorative shapes */}
        <View style={styles.admin_panel}>
          {/* Decorative shapes */}
          <View style={styles.decorative_shape_circle} />
          <View style={styles.decorative_shape_rectangle} />
          <View style={styles.decorative_shape_triangle} />
          
          {/* Header */}
          <Text style={styles.admin_panel_title}>Admin Dashboard</Text>
          
          {/* Band info */}
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Band Name</Text>
              <Text style={styles.infoValue}>{bandName || "Loading..."}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Total Members</Text>
              <Text style={styles.infoValue}>{totalMembers}</Text>
            </View>
          </View>
        </View>
        
        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Management</Text>
          
          <View style={styles.gridContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/admin/addmember")}
            >
              <View style={[styles.iconWrapper, { backgroundColor: "#4361ee" }]}>
                <IconSymbol name="person.badge.plus" color="#fff" size={30} />
              </View>
              <Text style={styles.menuText}>Add Member</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/admin/addsong")}
            >
              <View style={[styles.iconWrapper, { backgroundColor: "#3a0ca3" }]}>
                <IconSymbol name="plus" color="#fff" size={30} />
              </View>
              <Text style={styles.menuText}>Add Song</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/admin/setlistgenerator")}
            >
              <View style={[styles.iconWrapper, { backgroundColor: "#4cc9f0" }]}>
                <IconSymbol name="list.bullet" color="#fff" size={30} />
              </View>
              <Text style={styles.menuText}>Generate Setlist</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/admin/schedule")}
            >
              <View style={[styles.iconWrapper, { backgroundColor: "#f72585" }]}>
                <IconSymbol name="calendar" color="#fff" size={30} />
              </View>
              <Text style={styles.menuText}>Schedule Practice</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/admin/addevent")}
            >
              <View style={[styles.iconWrapper, { backgroundColor: "#7209b7" }]}>
                <IconSymbol name="music.note.list" color="#fff" size={30} />
              </View>
              <Text style={styles.menuText}>Add Event</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/admin/assigntasks")}
            >
              <View style={[styles.iconWrapper, { backgroundColor: "#2ec4b6" }]}>
                <IconSymbol name="checkmark.square" color="#fff" size={30} />
              </View>
              <Text style={styles.menuText}>Assign Tasks</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/admin/settingsscreen")}
            >
              <View style={[styles.iconWrapper, { backgroundColor: "#560bad" }]}>
                <IconSymbol name="gearshape.fill" color="#fff" size={30} />
              </View>
              <Text style={styles.menuText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#f8f9fc",
  },
  container: {
    flex: 1,
    paddingBottom: 30,
  },
  admin_panel: {
    position: "relative",
    backgroundColor: "#4361ee",
    borderRadius: 20,
    padding: 25,
    margin: 16,
    marginBottom: 20,
    shadowColor: "#4361ee",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    overflow: "hidden", // This will clip the decorative shapes
  },
  // Decorative shapes
  decorative_shape_circle: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    top: -60,
    right: -30,
  },
  decorative_shape_rectangle: {
    position: "absolute",
    width: 80,
    height: 80,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    bottom: -20,
    left: 20,
    transform: [{ rotate: "25deg" }],
  },
  decorative_shape_triangle: {
    position: "absolute",
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 40,
    borderRightWidth: 40,
    borderBottomWidth: 80,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    right: 50,
    bottom: -30,
    transform: [{ rotate: "10deg" }],
  },
  admin_panel_title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  infoItem: {
    minWidth: "45%",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: "#ffffff",
    opacity: 0.8,
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  menuContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    marginLeft: 5,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  menuItem: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  menuText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  }
});

export default AdminHome;
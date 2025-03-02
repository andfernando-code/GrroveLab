import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import AsyncStorage
import adminstyles from "./adminstyle";
import { IconSymbol } from "@/app-example/components/ui/IconSymbol.ios";
import { router } from "expo-router";

const AdminHome = () => {
  const [bandName, setBandName] = useState("");

  useEffect(() => {
    const fetchBandName = async () => {
      const storedBandName = await AsyncStorage.getItem("bandName");
      if (storedBandName) {
        setBandName(storedBandName);
      }
    };
    fetchBandName();
  }, []);

  return (
    <ScrollView>
      <View style={{ flex: 1 }}>
        <ImageBackground
          source={require("../../assets/images/adminpanel.png")}
          style={adminstyles.admin_panel}
        >
          {/* ✅ Display the Band Name */}
          <Text style={adminstyles.admin_panel_text}>
            Band Name: {bandName || "Loading..."}
          </Text>
          <Text style={adminstyles.admin_panel_text}>Total Members: </Text>
        </ImageBackground>

        <View style={adminstyles.button_view_container}>
          <TouchableOpacity
            style={adminstyles.button_view}
            onPress={() => router.push("/admin/addmember")}
          >
            <View style={adminstyles.button_view_view}>
              <IconSymbol name={"person.badge.plus"} color={"#fff"} size={40} style={{ margin: 10 }} />
              <Text style={adminstyles.button_view_text}>Add a Member</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={adminstyles.button_view}
            onPress={() => router.push("/admin/addsong")}
          >
            <View style={adminstyles.button_view_view}>
              <IconSymbol name={"plus"} color={"#fff"} size={40} style={{ margin: 10 }} />
              <Text style={adminstyles.button_view_text}>Add a Song</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={adminstyles.button_view}
            onPress={() => router.push("/admin/addsong")}
          >
            <View style={adminstyles.button_view_view}>
              <IconSymbol name={"calendar"} color={"#fff"} size={40} style={{ margin: 10 }} />
              <Text style={adminstyles.button_view_text}>Schedule Practices</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default AdminHome;

import {
  View,
  Text,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import React from "react";
import adminstyles from "./adminstyle";
import styles from "../styles";
import { IconSymbol } from "@/app-example/components/ui/IconSymbol.ios";
import { Link, router } from "expo-router";

const AdminHome = () => {
  const addamember = () => {
    router.push("/admin/addmember");
  };

  const addasong = () => {
    router.push("/admin/addsong");
  };

  const schedule = () => {
    router.push("/admin/addmember");
  };

  return (
    <ScrollView>
      <View style={{ flex: 1 }}>
        <ImageBackground
          source={require("../../assets/images/adminpanel.png")}
          style={adminstyles.admin_panel}
        >
          <Text style={adminstyles.admin_panel_text}>Band Name: </Text>
          <Text style={adminstyles.admin_panel_text}>Total Evnets: </Text>
        </ImageBackground>

        <View style={adminstyles.button_view_container}>
          <TouchableOpacity
            style={adminstyles.button_view}
            onPress={addamember}
          >
            <View style={adminstyles.button_view_view}>
              <IconSymbol
                name={"person.badge.plus"}
                color={"#fff"}
                size={40}
                style={{ margin: 10 }}
              ></IconSymbol>
              <Text style={adminstyles.button_view_text}>Add a Member</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={adminstyles.button_view}
            onPress={addasong}
          >
            <View style={adminstyles.button_view_view}>
              <IconSymbol
                name={"plus"}
                color={"#fff"}
                size={40}
                style={{ margin: 10 }}
              ></IconSymbol>
              <Text style={adminstyles.button_view_text}>Add a Song</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={adminstyles.button_view}
            onPress={schedule}
          >
            <View style={adminstyles.button_view_view}>
              <IconSymbol
                name={"calendar"}
                color={"#fff"}
                size={40}
                style={{ margin: 10 }}
              ></IconSymbol>
              <Text style={adminstyles.button_view_text}>Schedule Practices</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default AdminHome;

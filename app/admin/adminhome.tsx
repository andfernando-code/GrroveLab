import { View, Text, ScrollView, ImageBackground } from "react-native";
import React from "react";
import adminstyles from "./adminstyle";
import styles from "../styles";
import { IconSymbol } from "@/app-example/components/ui/IconSymbol.ios";
import { Link } from "expo-router";

const AdminHome = () => {
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
          <View style={adminstyles.button_view}>
            <Link href={"/admin/addsong"} style={adminstyles.button_view_link}>
              <View style={adminstyles.button_view_link_view}>
                <IconSymbol name={"plus"} color={"#fff"} size={40} style={{margin:10}}></IconSymbol>
                <Text style={adminstyles.button_view_text}>Add a Song</Text>
              </View>
            </Link>
          </View>
          <View style={adminstyles.button_view}>
            <Link href={"/admin/addsong"} style={adminstyles.button_view_link}>
              <View style={adminstyles.button_view_link_view}>
                <IconSymbol name={"calendar"} color={"#fff"} size={40} style={{margin:10}}></IconSymbol>
                <Text style={adminstyles.button_view_text}>
                  Schedule Practices
                </Text>
              </View>
            </Link>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default AdminHome;

import { StyleSheet } from "react-native";

const adminstyles = StyleSheet.create({
  button_view_container: {
    flex: 1,
    height: 400,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  button_view: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    margin: 10,
    borderBlockColor: "rgba(0, 0, 0, 0.2)",
    borderWidth: 10,
    borderRadius: 15,
    backgroundColor: "#2b3cc2",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },

  button_view_link : {
    flex: 1,
    width: "100%",
  },

  button_view_link_view : {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  button_view_text: {
    color: "#fff",
    fontFamily: "times new roman",
    fontSize: 20,
  },

  admin_panel: {
    flex: 1,
    height: 300,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  admin_panel_text: {
    margin: 10,
    color: "#fff",
    fontFamily: "times new roman",
    fontSize: 20,
  },
});

export default adminstyles;

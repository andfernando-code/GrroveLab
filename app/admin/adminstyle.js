import { StyleSheet } from "react-native";

const adminstyles = StyleSheet.create({
  button_view_container: {
    flex: 1,
    height: "auto",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    borderWidth: 2,
    borderColor: "gray",
    border: 10,
    borderRadius: 20,
    margin: 5,
  },

  full_container: {
    padding: 10,
    zIndex: 1,

  },

  button_view: {
    flex: 1,
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    margin: 10,
    borderRadius: 15,
    backgroundColor: "#0a1b3c",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },

  button_view_view : {
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
    backgroundColor : "black",
  },

  admin_panel_text: {
    margin: 10,
    color: "#fff",
    fontFamily: "times new roman",
    fontSize: 20,
  },
});

export default adminstyles;

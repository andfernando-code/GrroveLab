import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    home_container_profile: {
        width: "100%",
        height: 300,
        backgroundColor: "#001330",
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    container_text_main: {
        fontSize: 30,
        margin: 20,
        color: "white",
    },
    calendar_card: {
        width: "auto", // Use a percentage width for responsiveness
        height: 180,
        padding: 0,
        backgroundColor: "#021896",
        margin: 20,
        borderRadius: 15,
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    calendar_text: {
        color: "white",
        fontSize: 30,
        fontWeight: "bold",
    },
    double_card_container: {
        margin: 20,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    double_card: {
        margin: 10,
        backgroundColor: "black",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        height: 180,
        borderRadius: 15,
        padding: 0,
    },

    double_card_link: {
        height: "100%",
        width:"100%",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    double_card_link_view: {
        flex: 1,
        height: "100%",
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
    },

    double_card_text: {
        color: "white",
        fontSize: 20,
        fontWeight: "bold",
    },

    home_profile_image : {
        width: 65,
        height: 65,
        borderRadius: "50%",
        objectFit : "contain",
        margin:10,
        borderColor : "green",
        borderWidth :2,
    }
});

export default styles;

import { View, Text } from 'react-native'
import React from 'react'
import adminstyles from "./adminstyle";
import styles from '../styles';

const AdminHome = () => {
  return (
    <View style={{flex:1}}>
      <View style={adminstyles.button_view_container}>
        <View style={adminstyles.button_view}>
            <Text>Add a Song</Text>
        </View>
        <View style={adminstyles.button_view}>
            <Text>Schedule Practices</Text>
        </View>
      </View>
    </View>
  )
}

export default AdminHome
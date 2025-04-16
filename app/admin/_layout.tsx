import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const AdminLayout = () => {
  return (
   <Stack>
    <Stack.Screen name='adminhome' options={{headerTitle: "Admin Panel"}}/>
    <Stack.Screen name='addsong' options={{headerTitle: "Add a Song"}}/>
    <Stack.Screen name='addmember' options={{headerTitle: "Add a Member"}}/>
    <Stack.Screen name='adminsignin' options={{headerShown: false}}/>
    <Stack.Screen name='schedule' options={{headerTitle: "Shedule Practices"}}/>
    <Stack.Screen name='addevent' options={{headerTitle: "Add an Event"}}/>
    <Stack.Screen name='setlistgenerator' options={{headerTitle: "Generate Setlists"}}/>
   </Stack>
  )
}

export default AdminLayout
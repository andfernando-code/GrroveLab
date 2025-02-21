import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const AdminLayout = () => {
  return (
   <Stack>
    <Stack.Screen name='adminhome' options={{headerTitle: "Admin Panel"}}/>
   </Stack>
  )
}

export default AdminLayout
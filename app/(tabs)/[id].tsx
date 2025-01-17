import { View, Text, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import styles from '../styles';

export default function CardDetails() {
  const params = useLocalSearchParams();
  
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: params.image as string }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <Text style={styles.title}>{params.title}</Text>
        <Text style={styles.description}>{params.description}</Text>
      </View>
    </View>
  );
}
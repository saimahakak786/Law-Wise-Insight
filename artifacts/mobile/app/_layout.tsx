import React from 'react';
import { View, Text } from 'react-native';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#070D24' }}>
      <Text style={{ color: 'white', fontSize: 20 }}>App is working!</Text>
    </View>
  );
}

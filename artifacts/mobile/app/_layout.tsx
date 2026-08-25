import React from 'react';
import { View, Text } from 'react-native';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#070D24' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 18 }}>Testing Base Layout</Text>
    </View>
  );
}

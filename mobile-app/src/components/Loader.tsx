import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal, Text } from 'react-native';

interface LoaderProps {
  visible: boolean;
  message?: string;
}

const Loader = ({ visible, message = 'Loading...' }: LoaderProps) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#2563eb" />
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 150,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '600',
  },
});

export default Loader;

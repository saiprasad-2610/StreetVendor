import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';

const App = () => {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="#f3f4f6" />
        <AppNavigator />
      </SafeAreaProvider>
    </Provider>
  );
};

registerRootComponent(App);

export default App;

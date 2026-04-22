import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import api from '../services/api';

const RazorpayPaymentScreen = ({ route, navigation }: any) => {
  const { orderData, razorpayKey } = route.params;
  const [verifying, setVerifying] = useState(false);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body>
        <script>
          const options = {
            "key": "${razorpayKey}",
            "amount": "${orderData.amount}",
            "currency": "${orderData.currency}",
            "name": "SVMS Payments",
            "description": "Challan Payment",
            "order_id": "${orderData.razorpayOrderId}",
            "handler": function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: 'success',
                response: response
              }));
            },
            "modal": {
              "ondismiss": function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  status: 'cancelled'
                }));
              }
            }
          };
          const rzp = new Razorpay(options);
          rzp.open();
        </script>
      </body>
    </html>
  `;

  const onMessage = async (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.status === 'success') {
      setVerifying(true);
      try {
        const verifyResponse = await api.post('/payments/verify', {
          razorpayOrderId: data.response.razorpay_order_id,
          razorpayPaymentId: data.response.razorpay_payment_id,
          razorpaySignature: data.response.razorpay_signature,
        });

        if (verifyResponse.data === true) {
          Alert.alert('Success', 'Payment verified successfully!');
          navigation.navigate('MainTabs', { screen: 'Dashboard' });
        } else {
          Alert.alert('Error', 'Payment verification failed. Please contact support.');
          navigation.goBack();
        }
      } catch (err) {
        Alert.alert('Error', 'Something went wrong during verification.');
        navigation.goBack();
      } finally {
        setVerifying(false);
      }
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      {verifying ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          onMessage={onMessage}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  }
});

export default RazorpayPaymentScreen;

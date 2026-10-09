import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

// Replace this with your actual RevenueCat Public API Key when you create your account
const API_KEYS = {
  google: 'goog_YOUR_REVENUECAT_PUBLIC_API_KEY',
};

export const initializePurchases = async () => {
  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  if (Platform.OS === 'android') {
    await Purchases.configure({ apiKey: API_KEYS.google });
  }
};

export const checkProStatus = async (): Promise<boolean> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    // Checks if the 'pro' entitlement is active
    return typeof customerInfo.entitlements.active['pro'] !== 'undefined';
  } catch (e) {
    console.error('Error checking subscription status:', e);
    return false;
  }
};

export const purchaseProPackage = async (packageToBuy: any) => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
    return typeof customerInfo.entitlements.active['pro'] !== 'undefined';
  } catch (e: any) {
    if (!e.userCancelled) {
      console.error('Purchase failed:', e);
    }
    return false;
  }
};

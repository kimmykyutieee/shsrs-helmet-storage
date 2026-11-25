import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';

let Notifications = null;
let Device = null;
try { Notifications = require('expo-notifications'); } catch (_e) {}
try { Device = require('expo-device'); } catch (_e) {}

const isWeb = Platform.OS === 'web';
let webPushSubscription = null;
let notificationResponseListener = null;
let notificationReceivedListener = null;

const canUseExpoNotifications = () => !isWeb && Notifications && typeof Notifications.getExpoPushTokenAsync === 'function';

const configureNotificationHandling = () => {
  if (!canUseExpoNotifications()) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};

const getExpoProjectId = () =>
  Constants?.easConfig?.projectId
  || Constants?.expoConfig?.extra?.eas?.projectId
  || Constants?.expoConfig?.projectId
  || undefined;

const getExpoPushToken = async () => {
  if (!canUseExpoNotifications()) return null;
  if (Device && Device.isDevice === false) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#08122b',
    });
  }

  const projectId = getExpoProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return tokenResponse?.data || null;
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = globalThis.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

const getWebPushSubscription = async () => {
  if (!isWeb || typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return null;
  if (!window.isSecureContext) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const { publicKey } = await api('GET', '/api/push/vapid-public-key');
    if (!publicKey) return null;
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  webPushSubscription = subscription;
  return subscription.toJSON();
};

const registerPushNotifications = async () => {
  try {
    if (isWeb) {
      const subscription = await getWebPushSubscription();
      if (!subscription) return null;
      await api('POST', '/api/push/register', {
        platform: 'web',
        token: subscription,
        deviceLabel: navigator.userAgent?.slice(0, 200) || 'web',
      });
      return { platform: 'web', token: subscription };
    }

    configureNotificationHandling();
    const token = await getExpoPushToken();
    if (!token) return null;
    await api('POST', '/api/push/register', {
      platform: 'expo',
      token,
      deviceLabel: `${Platform.OS}${Device?.modelName ? ` ${Device.modelName}` : ''}`.slice(0, 200),
    });
    return { platform: 'expo', token };
  } catch (error) {
    console.warn('Push registration failed:', error?.message || error);
    return null;
  }
};

const unregisterPushNotifications = async () => {
  try {
    if (isWeb) {
      const subscription = webPushSubscription
        || (typeof navigator !== 'undefined' && 'serviceWorker' in navigator
          ? await (await navigator.serviceWorker.ready).pushManager.getSubscription()
          : null);
      if (subscription) {
        await api('POST', '/api/push/unregister', { platform: 'web', token: subscription.toJSON() });
        await subscription.unsubscribe().catch(() => {});
        webPushSubscription = null;
      }
      return;
    }
    if (!canUseExpoNotifications()) return;
    const projectId = getExpoProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined).catch(() => null);
    const token = tokenResponse?.data;
    if (token) await api('POST', '/api/push/unregister', { platform: 'expo', token }).catch(() => {});
  } catch (error) {
    console.warn('Push unregister failed:', error?.message || error);
  }
};

const addPushNotificationListeners = ({ onReceive, onResponse } = {}) => {
  if (isWeb) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return () => {};
    const handler = (event) => {
      const message = event?.data;
      if (message?.type !== 'HELMATE_NOTIFICATION_CLICK') return;
      onResponse?.({ notification: { request: { content: { data: message.data || {} } } } });
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }

  if (!canUseExpoNotifications()) return () => {};
  notificationReceivedListener?.remove?.();
  notificationResponseListener?.remove?.();
  notificationReceivedListener = Notifications.addNotificationReceivedListener((notification) => {
    onReceive?.(notification);
  });
  notificationResponseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    onResponse?.(response);
  });
  return () => {
    notificationReceivedListener?.remove?.();
    notificationResponseListener?.remove?.();
    notificationReceivedListener = null;
    notificationResponseListener = null;
  };
};

export { registerPushNotifications, unregisterPushNotifications, addPushNotificationListeners };

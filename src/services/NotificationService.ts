import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { reportError } from '../utils/reportError';

type NotificationData = Record<string, unknown>;
type ResponseCallback = (data: NotificationData) => void;
type TokenCallback = (token: string) => void;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let _responseSubscription: Notifications.EventSubscription | null = null;
let _tokenSubscription: Notifications.EventSubscription | null = null;
let _storedToken: string | null = null;
let _tokenCallback: TokenCallback | null = null;

const NotificationService = {
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
        });
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return null;

      const token = await Notifications.getExpoPushTokenAsync();
      _storedToken = token.data;

      // Listen for token refreshes so Firestore always has the current token
      _tokenSubscription?.remove();
      _tokenSubscription = Notifications.addPushTokenListener((newToken) => {
        _storedToken = newToken.data;
        _tokenCallback?.(newToken.data);
      });

      return _storedToken;
    } catch (e) {
      reportError('NotificationService.register', e);
      return null;
    }
  },

  /** Returns the most-recently obtained push token, or null if not yet registered. */
  getToken(): string | null {
    return _storedToken;
  },

  /**
   * Register a callback that fires whenever the push token changes (refresh).
   * Used by useBootstrapAuth to keep the Firestore user profile in sync.
   */
  onTokenRefresh(cb: TokenCallback): void {
    _tokenCallback = cb;
  },

  setupResponseListener(callback: ResponseCallback): void {
    _responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data as NotificationData;
        callback(data);
      } catch (e) {
        reportError('NotificationService.responseListener', e);
      }
    });
  },

  removeListeners(): void {
    _responseSubscription?.remove();
    _responseSubscription = null;
    _tokenSubscription?.remove();
    _tokenSubscription = null;
    _tokenCallback = null;
  },

  async scheduleLocalNotification(
    title: string,
    body: string,
    data: NotificationData,
    trigger: Notifications.NotificationTriggerInput
  ): Promise<string | null> {
    try {
      return await Notifications.scheduleNotificationAsync({
        content: { title, body, data, sound: true },
        trigger,
      });
    } catch (e) {
      reportError('NotificationService.schedule', e);
      return null;
    }
  },

  async cancelNotification(id: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      reportError('NotificationService.cancel', e);
    }
  },
};

export default NotificationService;

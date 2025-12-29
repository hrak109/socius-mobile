import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useSession } from '../context/AuthContext';
import { View, ActivityIndicator, Alert, Platform } from 'react-native';
import ChatHead from '../components/ChatHead';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { NotificationProvider } from '../context/NotificationContext';
import { LanguageProvider } from '../context/LanguageContext';
import { UserProfileProvider } from '../context/UserProfileContext';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
// import Constants from 'expo-constants';
// import { Platform } from 'react-native'; // Removed duplicate
import api from '../services/api';

// Track current path for notification logic
let currentPathname = '';


async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    // console.log('Must use physical device for Push Notifications');
    // return; // Allow simulator for now to avoid crashes if called, though it won't work
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }
  // For Native FCM, we don't need the Expo Project ID in the same way, but we need to ensure we are on a physical device.
  // const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? '849db0b4-1558-4ecd-ad96-595c72be2719';

  try {
    // Switch to getDevicePushTokenAsync for raw FCM token
    const pushTokenString = (await Notifications.getDevicePushTokenAsync()).data;
    console.log('Generated Device Push Token:', pushTokenString);
    return pushTokenString;
  } catch (e: any) {
    console.error('Error fetching push token:', e);
    Alert.alert('Push Token Error', e.message || 'Unknown error');
  }
}


const InitialLayout = () => {
  const { session, isLoading } = useSession();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const { isDark } = useTheme();

  // Keep track of current path for notification handler
  useEffect(() => {
    currentPathname = pathname;
    console.log('Current Path Update:', currentPathname);
  }, [pathname]);

  // Dynamic Notification Handler
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        // Check if we should show alert based on current screen
        // If we are in the chat or messages screen, we might want to suppress the banner
        // Actually, precise suppression requires checking WHO sent it (user ID vs param ID).
        // For now, suppress generic alerts if on message screen as requested.

        const isMessageScreen = currentPathname && (currentPathname.startsWith('/messages') || currentPathname.startsWith('/chat'));
        const shouldShow = !isMessageScreen;

        return {
          shouldShowAlert: shouldShow,
          shouldPlaySound: shouldShow,
          shouldSetBadge: true,
          shouldShowBanner: shouldShow,
          shouldShowList: true,
        };
      },
    });
  }, []); // Set once, but it references the mutable currentPathname variable

  useEffect(() => {
    if (isLoading) return;

    const isAtRoot = pathname === '/';
    console.log('Nav State:', { session: !!session, pathname, segments });

    if (!session && !isAtRoot && !pathname.startsWith('/setup')) {
      // Redirect to the sign-in page if not logged in and trying to access protected route
      router.replace('/');
    } else if (session && isAtRoot) {
      // Redirect to the home page if logged in and on root
      router.replace('/home');
    }

    if (session) {
      console.log('Session active, interacting with push notifications...');
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          console.log('Sending Push Token to backend:', token);
          api.post('/notifications/token', { token })
            .then(() => console.log('Token sent successfully'))
            .catch(err => console.error('Failed to send token', err));
        } else {
          console.log('No push token returned from registration');
        }
      });

      const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.url) {
          router.push(data.url as any);
        }
      });

      return () => subscription.remove();
    }
  }, [session, isLoading, segments, pathname]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Slot />
      {session && !pathname.startsWith('/setup') && <ChatHead />}
    </>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <LanguageProvider>
            <UserProfileProvider>
              <InitialLayout />
            </UserProfileProvider>
          </LanguageProvider>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

import { Slot, Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useSession } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import ChatHead from '../components/ChatHead';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

const InitialLayout = () => {
  const { session, isLoading } = useSession();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const { isDark } = useTheme();

  useEffect(() => {
    if (isLoading) return;

    const isAtRoot = pathname === '/';
    console.log('Nav State:', { session: !!session, pathname, segments });

    if (!session && !isAtRoot) {
      // Redirect to the sign-in page if not logged in and trying to access protected route
      // But allow access to root (login page)
      router.replace('/');
    } else if (session && isAtRoot) {
      // Redirect to the chat page if logged in and on root
      router.replace('/home');
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
      {session && <ChatHead />}
    </>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <InitialLayout />
      </ThemeProvider>
    </AuthProvider>
  );
}

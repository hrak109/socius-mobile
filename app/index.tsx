import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSession } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
    const { session, isLoading } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const checkSetupAndRedirect = async () => {
            if (!session) {
                // Not logged in -> Go to Setup (Language -> Login)
                router.replace('/setup' as any);
                return;
            }

            try {
                const setupComplete = await AsyncStorage.getItem('setup_complete');
                if (setupComplete === 'true') {
                    // Logged in & Setup Done -> Home
                    router.replace('/home');
                } else {
                    // Logged in but Setup Incomplete -> Setup
                    router.replace('/setup' as any);
                }
            } catch (error) {
                console.error('Error checking setup status:', error);
                router.replace('/setup' as any);
            }
        };

        checkSetupAndRedirect();
    }, [session, isLoading]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
            <ActivityIndicator size="large" />
        </View>
    );
}

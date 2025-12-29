import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import ChatInterface from '../components/ChatInterface';

export default function ChatScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const params = useLocalSearchParams();
    const initialMessage = Array.isArray(params.initialMessage)
        ? params.initialMessage[0]
        : params.initialMessage || '';

    console.log('ChatScreen params normalized:', { initialMessage });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ChatInterface
                key={initialMessage} // Force re-mount to ensure text state initializes correctly
                onClose={() => router.back()}
                initialMessage={initialMessage}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

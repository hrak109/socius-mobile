import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import ChatInterface from '../components/ChatInterface';

export default function ChatScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const { initialMessage } = useLocalSearchParams<{ initialMessage: string }>();
    console.log('ChatScreen params:', { initialMessage });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ChatInterface
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

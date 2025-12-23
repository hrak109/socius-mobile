import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { GiftedChat, IMessage, Bubble, InputToolbar } from 'react-native-gifted-chat';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useSession } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function DMScreen() {
    const { id, username } = useLocalSearchParams<{ id: string, username?: string }>();
    const router = useRouter();
    const { session } = useSession();
    const { colors } = useTheme();
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [friendUsername, setFriendUsername] = useState<string>(username || 'Chat');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch friend details (or infer just chat history)
        // For simplicity, we just fetch chat history which might not have username if empty
        // Ideally we should have an endpoint GET /users/{id} or pass name via params
        // We'll rely on the conversations list passing it or just fetching it.
        // Let's fetch messages first.
        fetchMessages();
    }, [id]);

    const fetchMessages = async () => {
        try {
            const res = await api.get(`/messages/${id}`);
            const apiMessages = res.data.map((msg: any) => ({
                _id: msg.id,
                text: msg.content,
                createdAt: new Date(msg.created_at),
                user: {
                    _id: msg.is_me ? 1 : 2, // 1 is me, 2 is other
                    name: msg.is_me ? 'Me' : 'Friend',
                },
            }));

            // If we have messages, reverse them because GiftedChat expects newest first (index 0)
            setMessages(apiMessages.reverse());
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const onSend = useCallback(async (newMessages: IMessage[] = []) => {
        const msgText = newMessages[0].text;

        // Optimistic update
        setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));

        try {
            await api.post('/messages', {
                receiver_id: parseInt(id!),
                content: msgText
            });
        } catch (error) {
            console.error('Failed to send message', error);
            // Optionally rollback
        }
    }, [id]);

    const renderBubble = (props: any) => (
        <Bubble
            {...props}
            wrapperStyle={{
                right: {
                    backgroundColor: colors.primary,
                },
                left: {
                    backgroundColor: colors.inputBackground,
                },
            }}
            textStyle={{
                right: { color: colors.buttonText },
                left: { color: colors.text },
            }}
        />
    );

    const renderInputToolbar = (props: any) => (
        <InputToolbar
            {...props}
            containerStyle={{
                backgroundColor: colors.card,
                borderTopColor: colors.border,
            }}
            primaryStyle={{ alignItems: 'center' }}
            textInputStyle={{ color: colors.text }}
        />
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{friendUsername}</Text>
                <View style={{ width: 40 }} />
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <GiftedChat
                    messages={messages}
                    onSend={messages => onSend(messages)}
                    user={{
                        _id: 1, // '1' is explicitly treated as 'me' in mapping above
                    }}
                    renderBubble={renderBubble}
                    renderInputToolbar={renderInputToolbar}
                    placeholder="Type a message..."
                    showUserAvatar={false}
                    renderAvatar={null}
                    alwaysShowSend
                    timeTextStyle={{
                        left: { color: colors.textSecondary },
                        right: { color: 'rgba(255, 255, 255, 0.7)' }
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

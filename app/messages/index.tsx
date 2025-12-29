import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { fixTimestamp } from '../../utils/date';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';

type Conversation = {
    friend_id: number;
    friend_username: string;
    last_message: string;
    last_message_time: string | null;
    unread_count?: number;
};

export default function MessagesScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ... (fetchConversations same)

    const fetchConversations = async () => {
        try {
            const res = await api.get('/messages/recent');
            setConversations(res.data);
        } catch (error) {
            console.error('Failed to fetch messages', error);
        } finally {
            setIsLoading(false);
        }
    };

    const { lastNotificationTime } = useNotifications();

    useFocusEffect(
        useCallback(() => {
            fetchConversations();
        }, [lastNotificationTime]) // Refetch when notification arrives
    );

    const renderChatItem = ({ item }: { item: Conversation }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => router.push({ pathname: '/messages/[id]', params: { id: item.friend_id, username: item.friend_username } } as any)}
            activeOpacity={0.7}
        >
            <View style={styles.chatAvatarContainer}>
                <View style={[styles.chatAvatar, { backgroundColor: colors.inputBackground, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.textSecondary }}>
                        {item.friend_username.charAt(0).toUpperCase()}
                    </Text>
                </View>
            </View>
            <View style={styles.chatContent}>
                <View style={styles.rowBetween}>
                    <Text style={[styles.chatName, { color: colors.text }]}>{item.friend_username}</Text>
                    {item.last_message_time && (
                        <Text style={[styles.chatTime, { color: colors.textSecondary }]}>
                            {formatDistanceToNow(fixTimestamp(item.last_message_time), { addSuffix: true })}
                        </Text>
                    )}
                </View>
                <View style={styles.rowBetween}>
                    <Text 
                        style={[
                            styles.chatMessage, 
                            { 
                                color: (item.unread_count && item.unread_count > 0) ? (isDark ? '#fff' : '#000') : colors.textSecondary,
                                fontWeight: (item.unread_count && item.unread_count > 0) ? 'bold' : 'normal',
                                flex: 1, marginRight: 8
                            }
                        ]} 
                        numberOfLines={1}
                    >
                        {item.last_message}
                    </Text>
                    {(item.unread_count || 0) > 0 && (
                        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.unreadText}>{item.unread_count}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                        <Ionicons name="arrow-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{t('messages.title')}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/friends' as any)}>
                    <Ionicons name="create-outline" size={28} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Chat List */}
            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    renderItem={renderChatItem}
                    keyExtractor={item => item.friend_id.toString()}
                    contentContainerStyle={styles.chatList}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{t('messages.no_messages')}</Text>
                            <Text style={{ color: colors.disabled, fontSize: 14 }}>{t('messages.start_chat')}</Text>
                        </View>
                    }
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    chatList: {
        paddingTop: 10,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    chatAvatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    chatAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    chatContent: {
        flex: 1,
        justifyContent: 'center',
    },
    chatName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatMessage: {
        fontSize: 14,
    },
    chatTime: {
        fontSize: 12,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});

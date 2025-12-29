import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { GiftedChat, IMessage, User, Bubble, Avatar, InputToolbar, Send } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { fixTimestamp } from '../utils/date';
import { SOCIUS_AVATAR_MAP, PROFILE_AVATAR_MAP } from '../constants/avatars';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { useUserProfile } from '../context/UserProfileContext';

// Removed static BOT_USER


const SociusAvatar = ({ source }: { source: any }) => {
    const { colors } = useTheme();
    return (
        <View style={[styles.botAvatarContainer, { backgroundColor: colors.inputBackground }]}>
            <Image
                source={source}
                style={styles.botAvatarImage}
            />
        </View>
    );
};

interface ChatInterfaceProps {
    onClose?: () => void;
    isModal?: boolean;
    initialMessage?: string;
}

export default function ChatInterface({ onClose, isModal = false, initialMessage = '' }: ChatInterfaceProps) {
    const { colors, avatarId } = useTheme();
    const { t, language } = useLanguage();
    const { displayName, displayAvatar } = useUserProfile();

    const botUser: User = {
        _id: 2,
        name: t('chat.socius'),
    };
    const { user } = useAuth(); // Use AuthContext for user info if available
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [text, setText] = useState(initialMessage);
    const [isTyping, setIsTyping] = useState(false);
    // const [userInfo, setUserInfo] = useState<any>(null); // Replaced by useAuth
    const selectedModel = 'soc-llama3.2:3b';
    // Removed local botAvatarSource state
    const { lastNotificationTime, refreshNotifications } = useNotifications();
    const textInputRef = useRef<any>(null);

    useEffect(() => {
        if (initialMessage) {
            setText(initialMessage);
            // Delay focus to ensure layout is ready
            setTimeout(() => {
                if (textInputRef.current) {
                    textInputRef.current.focus();
                }
            }, 600);
        }
    }, [initialMessage]);

    useEffect(() => {
        // Avatar is now handled by ThemeContext

        setMessages([]); // Clear messages initially
        const fetchHistory = async () => {
            try {
                const res = await api.get('/history', {
                    params: { model: selectedModel }
                });
                const history = res.data;
                const formattedMessages = history.map((msg: any) => ({
                    _id: msg.id,
                    text: msg.content,
                    createdAt: fixTimestamp(msg.created_at),
                    user: msg.role === 'user' ? {
                        _id: 1,
                        name: displayName || user?.name || 'Me',
                        avatar: displayAvatar ? PROFILE_AVATAR_MAP[displayAvatar] : user?.photo
                    } : botUser,
                }));

                if (formattedMessages.length === 0) {
                    setMessages([
                        {
                            _id: 1,
                            text: `Hello! I am Socius. How can I help you today?`, // TODO: Translate this properly later, using english default for now
                            createdAt: new Date(),
                            user: botUser,
                        },
                    ]);
                } else {
                    setMessages(formattedMessages.reverse());
                }
                refreshNotifications(); // Refresh to clear badge since backend marks as read
            } catch (error) {
                console.error('Failed to fetch history:', error);
                setMessages([
                    {
                        _id: 1,
                        text: 'Hello! I am Socius. How can I help you today?',
                        createdAt: new Date(),
                        user: botUser,
                    },
                ]);
            }
        };

        fetchHistory();
    }, [user?.photo, lastNotificationTime]); // Reload when user changes or notification arrives

    const handleSendQuestion = useCallback(async (text: string) => {
        setIsTyping(true);
        try {
            await api.post('/ask', {
                q_text: text,
                model: selectedModel
            });
            // We rely on background notification (and lastNotificationTime update) to fetch the answer
        } catch (error) {
            console.error('Error sending question:', error);
            setIsTyping(false);
            appendBotMessage('Sorry, I encountered an error sending your message.');
        }
    }, [selectedModel]);

    const onSend = useCallback((newMessages: IMessage[] = []) => {
        setMessages((previousMessages) => GiftedChat.append(previousMessages, newMessages));
        const messageText = newMessages[0].text;
        handleSendQuestion(messageText);
        setText(''); // Clear input after sending
    }, [handleSendQuestion]);
    useEffect(() => {
        if (messages.length > 0 && messages[0].user._id !== 1) {
            setIsTyping(false);
        }
    }, [messages]);

    const appendBotMessage = (text: string) => {
        const msg: IMessage = {
            _id: Math.round(Math.random() * 1000000),
            text,
            createdAt: new Date(),
            user: botUser,
        };
        setMessages((previousMessages) => GiftedChat.append(previousMessages, [msg]));
    };



    const renderBubble = (props: any) => (
        <Bubble
            {...props}
            wrapperStyle={{
                left: { backgroundColor: colors.inputBackground, borderRadius: 15 },
                right: { backgroundColor: colors.primary, borderRadius: 15 }
            }}
            textStyle={{
                left: { color: colors.text },
                right: { color: colors.buttonText }
            }}
        />
    );

    const renderInputToolbar = (props: any) => (
        <InputToolbar
            {...props}
            containerStyle={{
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                borderTopWidth: 1,
            }}
            primaryStyle={{ alignItems: 'center' }}
            textInputStyle={{ color: colors.text }}
        />
    );

    const renderAvatar = (props: any) => {
        if (props.currentMessage?.user?._id === 1) {
            return (
                <Avatar
                    {...props}
                    currentMessage={{
                        ...props.currentMessage,
                        user: {
                            ...props.currentMessage.user,
                            avatar: user?.photo || props.currentMessage.user.avatar
                        }
                    }}
                    imageStyle={{ left: styles.userAvatar, right: styles.userAvatar }}
                />
            );
        }
        return <SociusAvatar source={SOCIUS_AVATAR_MAP[avatarId] || SOCIUS_AVATAR_MAP['socius-icon']} />;
    };

    const renderSend = (props: any) => (
        <Send
            {...props}
            label={t('chat.send')}
            textStyle={{ color: colors.primary }}
        />
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                {onClose ? (
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        {isModal ? (
                            <Ionicons name="close" size={24} color={colors.text} />
                        ) : (
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        )}
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('chat.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                enabled={Platform.OS === 'ios'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
                <GiftedChat
                    messages={messages}
                    text={text}
                    textInputRef={textInputRef}
                    onInputTextChanged={setText}
                    onSend={(messages) => onSend(messages)}
                    user={{
                        _id: 1,
                        name: displayName || user?.name || 'Me',
                        avatar: displayAvatar ? PROFILE_AVATAR_MAP[displayAvatar] : (user?.photo || undefined),
                    }}
                    isTyping={isTyping}
                    locale={language}
                    renderBubble={renderBubble}
                    renderAvatar={renderAvatar}
                    renderInputToolbar={renderInputToolbar}
                    renderSend={renderSend}
                    placeholder={t('chat.placeholder')}
                    showUserAvatar={true}
                    alwaysShowSend
                    isScrollToBottomEnabled
                    renderUsernameOnMessage={true}
                    timeTextStyle={{
                        left: { color: colors.textSecondary },
                        right: { color: 'rgba(255, 255, 255, 0.7)' }
                    }}
                    textInputProps={{
                        contextMenuHidden: false,
                        keyboardType: 'default',
                    }}
                />
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 10,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 8,
    },
    clearButton: {
        padding: 8,
    },
    userAvatar: {
        borderRadius: 18,
        width: 36,
        height: 36,
    },
    botAvatarContainer: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
    },
    botAvatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
});

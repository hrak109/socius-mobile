import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { GiftedChat, IMessage, User, Bubble, Avatar, InputToolbar } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AVATAR_MAP } from '../constants/avatars';

const BOT_USER: User = {
    _id: 2,
    name: 'Socius',
};

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
}

export default function ChatInterface({ onClose, isModal = false }: ChatInterfaceProps) {
    const { colors } = useTheme();
    const { user } = useAuth(); // Use AuthContext for user info if available
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    // const [userInfo, setUserInfo] = useState<any>(null); // Replaced by useAuth
    const selectedModel = 'soc-llama3.2:3b';
    const [botAvatarSource, setBotAvatarSource] = useState(AVATAR_MAP['socius-icon']);

    useEffect(() => {
        // Load avatar preference
        const loadAvatar = async () => {
            try {
                const savedAvatar = await AsyncStorage.getItem('socius_avatar_preference');
                if (savedAvatar && AVATAR_MAP[savedAvatar]) {
                    setBotAvatarSource(AVATAR_MAP[savedAvatar]);
                }
            } catch (e) {
                console.log('Failed to load avatar');
            }
        };
        loadAvatar();

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
                    createdAt: new Date(msg.created_at),
                    user: msg.role === 'user' ? {
                        _id: 1,
                        name: user?.name || 'Me',
                        avatar: user?.photo
                    } : BOT_USER,
                }));

                if (formattedMessages.length === 0) {
                    setMessages([
                        {
                            _id: 1,
                            text: `Hello! I am Socius. How can I help you today?`,
                            createdAt: new Date(),
                            user: BOT_USER,
                        },
                    ]);
                } else {
                    setMessages(formattedMessages.reverse());
                }
            } catch (error) {
                console.error('Failed to fetch history:', error);
                setMessages([
                    {
                        _id: 1,
                        text: 'Hello! I am Socius. How can I help you today?',
                        createdAt: new Date(),
                        user: BOT_USER,
                    },
                ]);
            }
        };

        fetchHistory();
    }, [user?.photo]);

    const handleSendQuestion = useCallback(async (text: string) => {
        setIsTyping(true);
        try {
            const res = await api.post('/ask', {
                q_text: text,
                model: selectedModel
            });

            const { question_id } = res.data;
            pollAnswer(question_id, selectedModel);
        } catch (error) {
            console.error('Error sending question:', error);
            setIsTyping(false);
            appendBotMessage('Sorry, I encountered an error sending your message.');
        }
    }, [selectedModel]);

    const onSend = useCallback((newMessages: IMessage[] = []) => {
        setMessages((previousMessages) => GiftedChat.append(previousMessages, newMessages));
        const text = newMessages[0].text;
        handleSendQuestion(text);
    }, [handleSendQuestion]);

    const pollAnswer = async (qid: string, modelUsed: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/get_answer/${qid}`, {
                    params: { model: modelUsed }
                });
                const data = res.data;

                if (data.status === 'answered') {
                    clearInterval(interval);
                    setIsTyping(false);
                    appendBotMessage(data.answer);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 2000);

        setTimeout(() => {
            clearInterval(interval);
            if (isTyping) {
                setIsTyping(false);
                appendBotMessage('Response timed out.');
            }
        }, 120000);
    };

    const appendBotMessage = (text: string) => {
        const msg: IMessage = {
            _id: Math.round(Math.random() * 1000000),
            text,
            createdAt: new Date(),
            user: BOT_USER,
        };
        setMessages((previousMessages) => GiftedChat.append(previousMessages, [msg]));
    };

    const clearHistory = async () => {
        try {
            await api.post('/clear_history', { model: selectedModel });
            setMessages([
                {
                    _id: Math.round(Math.random() * 1000000),
                    text: 'Chat history cleared.',
                    createdAt: new Date(),
                    user: BOT_USER,
                    system: true
                },
                {
                    _id: Math.round(Math.random() * 1000000),
                    text: 'Hello! I am Socius. How can I help you today?',
                    createdAt: new Date(),
                    user: BOT_USER,
                }
            ]);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
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
        return <SociusAvatar source={botAvatarSource} />;
    };

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
                <Text style={[styles.headerTitle, { color: colors.text }]}>Socius Chat</Text>
                <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
                    <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <GiftedChat
                messages={messages}
                onSend={(messages) => onSend(messages)}
                user={{
                    _id: 1,
                    name: user?.name || 'Me',
                    avatar: user?.photo || undefined,
                }}
                isTyping={isTyping}
                renderBubble={renderBubble}
                renderAvatar={renderAvatar}
                renderInputToolbar={renderInputToolbar}
                showUserAvatar={true}
                alwaysShowSend
                isScrollToBottomEnabled
                renderUsernameOnMessage={true}
                timeTextStyle={{
                    left: { color: colors.textSecondary },
                    right: { color: 'rgba(255, 255, 255, 0.7)' }
                }}
            />
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

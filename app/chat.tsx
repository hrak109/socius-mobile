import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GiftedChat, IMessage, User, Bubble, Avatar } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../context/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import api from '../services/api';

const BOT_USER: User = {
    _id: 2,
    name: 'Socius',
};

const SociusAvatar = () => (
    <View style={styles.botAvatarContainer}>
        <Image
            source={require('../assets/images/socius-icon.png')}
            style={styles.botAvatarImage}
        />
    </View>
);

export default function ChatScreen() {
    const { signOut } = useSession();
    const router = useRouter();
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);
    const selectedModel = 'soc-llama3.2:3b'; // Fixed model

    useEffect(() => {
        const loadUser = async () => {
            try {
                const user = await GoogleSignin.getCurrentUser();
                if (user?.user) {
                    setUserInfo(user.user);
                }
            } catch (error) {
                console.log('Failed to load user info', error);
            }
        };
        loadUser();

        setMessages([]); // Clear messages initially
        const fetchHistory = async () => {
            try {
                const res = await api.get('/api/socius/history', {
                    params: { model: selectedModel }
                });
                const history = res.data;
                const formattedMessages = history.map((msg: any) => ({
                    _id: msg.id,
                    text: msg.content,
                    createdAt: new Date(msg.created_at),
                    user: msg.role === 'user' ? {
                        _id: 1,
                        name: userInfo?.name || 'Me',
                        avatar: userInfo?.photo
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
    }, [userInfo?.photo]); // Refetch/Reformat when userInfo loads

    const handleSendQuestion = useCallback(async (text: string) => {
        setIsTyping(true);
        try {
            const res = await api.post('/api/socius/ask', {
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
                const res = await api.get(`/api/socius/get_answer/${qid}`, {
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

    const renderBubble = (props: any) => (
        <Bubble
            {...props}
            wrapperStyle={{
                left: { backgroundColor: '#f0f0f0', borderRadius: 15 },
                right: { backgroundColor: '#1a73e8', borderRadius: 15 }
            }}
            textStyle={{
                left: { color: '#333' },
                right: { color: '#fff' }
            }}
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
                            avatar: userInfo?.photo || props.currentMessage.user.avatar
                        }
                    }}
                    imageStyle={{ left: styles.userAvatar, right: styles.userAvatar }}
                />
            );
        }
        return <SociusAvatar />;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Socius Chat</Text>
                <View style={{ width: 40 }} />
            </View>

            <GiftedChat
                messages={messages}
                onSend={(messages) => onSend(messages)}
                user={{
                    _id: 1,
                    name: userInfo?.name || 'Me',
                    avatar: userInfo?.photo,
                }}
                isTyping={isTyping}
                renderBubble={renderBubble}
                renderAvatar={renderAvatar}
                showUserAvatar={true}
                alwaysShowSend
                isScrollToBottomEnabled
                renderUsernameOnMessage={true}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    backButton: {
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
    },
    botAvatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
});

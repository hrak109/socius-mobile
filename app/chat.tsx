import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Modal, FlatList, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GiftedChat, IMessage, User, Bubble } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../context/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../services/api';

const BOT_USER: User = {
    _id: 2,
    name: 'Socius',
    avatar: 'https://placeimg.com/140/140/tech',
};

const MODELS = [
    { id: 'hbb-llama3.2:3b', name: '🧠 HBB Model', disabled: false },
    { id: 'ohp-llama3.2:3b', name: '🌲 OHP Model', disabled: false },
    { id: 'rag-engine', name: '📚 RAG Engine', disabled: true },
];

export default function ChatScreen() {
    const { signOut } = useSession();
    const router = useRouter();
    const { model } = useLocalSearchParams<{ model: string }>();
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [selectedModel, setSelectedModel] = useState(model || 'hbb-llama3.2:3b');
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        setMessages([]); // Clear messages immediately on switch for visual feedback
        const fetchHistory = async () => {
            try {
                // Fetch context-aware history
                const res = await api.get('/api/socius/history', {
                    params: { model: selectedModel }
                });
                const history = res.data;
                const formattedMessages = history.map((msg: any) => ({
                    _id: msg.id,
                    text: msg.content,
                    createdAt: new Date(msg.created_at),
                    user: msg.role === 'user' ? { _id: 1 } : BOT_USER,
                }));
                // Add initial greeting at the end if history is empty
                if (formattedMessages.length === 0) {
                    setMessages([
                        {
                            _id: 1,
                            text: `Hello! You are now chatting with ${selectedModel}.`,
                            createdAt: new Date(),
                            user: BOT_USER,
                        },
                    ]);
                } else {
                    setMessages(formattedMessages);
                }
            } catch (error) {
                console.error('Failed to fetch history:', error);
                setMessages([
                    {
                        _id: 1,
                        text: 'Hello! How can I help you today?',
                        createdAt: new Date(),
                        user: BOT_USER,
                    },
                ]);
            }
        };

        fetchHistory();
    }, [selectedModel]); // Refetch when model changes

    const handleSendQuestion = useCallback(async (text: string) => {
        setIsTyping(true);
        try {
            // Send question with selected model
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
                // Pass model so we can tag the answer in history
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
                // Don't clear interval immediately on transient errors, but maybe add timeout logic
            }
        }, 2000);

        // Timeout after 2 minutes
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

    const handleSignOut = async () => {
        await signOut();
        router.replace('/');
    };

    const handleSelectModel = (modelId: string) => {
        setSelectedModel(modelId);
        setModalVisible(false);
    };

    const getModelName = (id: string) => {
        return MODELS.find(m => m.id === id)?.name || id;
    };

    const renderChatFooter = () => (
        <View style={styles.footerContainer}>
            <TouchableOpacity
                style={styles.modelSelector}
                onPress={() => setModalVisible(true)}
            >
                <Text style={styles.modelText}>{getModelName(selectedModel)} ▼</Text>
            </TouchableOpacity>
        </View>
    );

    const renderBubble = (props: any) => (
        <Bubble
            {...props}
            wrapperStyle={{
                left: { marginLeft: 0, paddingLeft: 0 },
                right: { marginRight: 0, paddingRight: 0 }
            }}
            containerStyle={{
                left: { marginLeft: 0, marginRight: 0 },
                right: { marginLeft: 0, marginRight: 0 }
            }}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select Model</Text>
                            {MODELS.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.modelOption,
                                        selectedModel === item.id && styles.selectedOption,
                                        item.disabled && styles.disabledOption
                                    ]}
                                    onPress={() => !item.disabled && handleSelectModel(item.id)}
                                    disabled={item.disabled}
                                >
                                    <Text style={[
                                        styles.modelOptionText,
                                        selectedModel === item.id && styles.selectedOptionText,
                                        item.disabled && styles.disabledOptionText
                                    ]}>
                                        {item.name} {item.disabled && '(Coming Soon)'}
                                    </Text>
                                    {selectedModel === item.id && <Text style={styles.checkmark}>✓</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <GiftedChat
                messages={messages}
                onSend={(messages) => onSend(messages)}
                user={{
                    _id: 1,
                }}
                isTyping={isTyping}
                renderChatFooter={renderChatFooter}
                renderBubble={renderBubble}
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
        flexDirection: 'row', // Ensure items are row aligned
        alignItems: 'center',
    },
    footerContainer: {
        padding: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modelSelector: {
        backgroundColor: '#f0f0f0',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    modelText: {
        fontWeight: '600',
        color: '#333',
    },
    backButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        alignItems: 'stretch',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    modelOption: {
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedOption: {
        backgroundColor: '#f0f8ff',
    },
    disabledOption: {
        opacity: 0.5,
    },
    modelOptionText: {
        fontSize: 16,
        color: '#333',
    },
    selectedOptionText: {
        color: '#007AFF',
        fontWeight: '600',
    },
    disabledOptionText: {
        color: '#999',
    },
    checkmark: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

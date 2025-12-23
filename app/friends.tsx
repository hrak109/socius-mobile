import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, TextInput, Image, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';
import api from '../services/api';

type FriendItem = {
    id: number;
    friend_id: number;
    friend_username: string;
    status: string;
};

type UserSearchResult = {
    id: number;
    username: string;
    email: string;
};

export default function FriendsScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
    const [friends, setFriends] = useState<FriendItem[]>([]);
    const [requests, setRequests] = useState<FriendItem[]>([]);

    // UI state
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const fetchFriends = async () => {
        try {
            const res = await api.get('/friends');
            setFriends(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await api.get('/friends/requests');
            setRequests(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchFriends();
        fetchRequests();
    }, []);

    const handleSearchUsers = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await api.get('/users/search', { params: { q: query } });
            setSearchResults(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const sendRequest = async (username: string) => {
        try {
            await api.post('/friends/request', { username });
            Alert.alert('Success', `Friend request sent to ${username}`);
            setSearchQuery('');
            setSearchResults([]);
            setIsAddModalVisible(false);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to send request');
        }
    };

    const acceptRequest = async (id: number) => {
        try {
            await api.post(`/friends/accept/${id}`);
            fetchRequests();
            fetchFriends();
        } catch (error) {
            console.error(error);
        }
    };

    const rejectRequest = async (id: number) => {
        try {
            await api.post(`/friends/reject/${id}`);
            fetchRequests();
        } catch (error) {
            console.error(error);
        }
    };

    const unfriend = async (friendId: number) => {
        Alert.alert(
            'Unfriend',
            'Are you sure you want to remove this friend? Chat history will be deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/friends/${friendId}`);
                            fetchFriends();
                        } catch (error) {
                            console.error(error);
                        }
                    }
                }
            ]
        );
    };

    const renderFriendItem = ({ item }: { item: FriendItem }) => (
        <View style={styles.friendCard}>
            <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{item.friend_username.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{item.friend_username}</Text>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionBtn, styles.chatBtn]} onPress={() => router.push({ pathname: '/dm/[id]', params: { id: item.friend_id, username: item.friend_username } } as any)}>
                    <Ionicons name="chatbubble-outline" size={20} color="#1a73e8" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => unfriend(item.friend_id)}>
                    <Ionicons name="trash-outline" size={20} color="#dc3545" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderRequestItem = ({ item }: { item: FriendItem }) => (
        <View style={styles.friendCard}>
            <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{item.friend_username.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{item.friend_username}</Text>
                <Text style={styles.usernameText}>Sent you a request</Text>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => acceptRequest(item.id)}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => rejectRequest(item.id)}>
                    <Ionicons name="close" size={20} color="#dc3545" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Friends</Text>
                <TouchableOpacity onPress={() => setIsAddModalVisible(true)}>
                    <Ionicons name="person-add" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
                <View style={[styles.tabPillContainer, { backgroundColor: colors.inputBackground }]}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'friends' && { backgroundColor: colors.primary, shadowColor: colors.shadow }]}
                        onPress={() => setActiveTab('friends')}
                    >
                        <Text style={[styles.tabText, { color: colors.text }, activeTab === 'friends' && { color: colors.buttonText }]}>My Friends</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'requests' && { backgroundColor: colors.primary, shadowColor: colors.shadow }]}
                        onPress={() => setActiveTab('requests')}
                    >
                        <Text style={[styles.tabText, { color: colors.text }, activeTab === 'requests' && { color: colors.buttonText }]}>
                            Requests {requests.length > 0 && <Text style={{ color: activeTab === 'requests' ? colors.buttonText : colors.error }}>({requests.length})</Text>}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={activeTab === 'friends' ? friends : requests}
                renderItem={activeTab === 'friends' ? renderFriendItem : renderRequestItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            {activeTab === 'friends' ? "No friends yet." : "No pending requests."}
                        </Text>
                    </View>
                }
            />

            <Modal
                visible={isAddModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsAddModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Friend</Text>
                            <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
                            placeholder="Search by username..."
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={handleSearchUsers}
                            autoCapitalize="none"
                        />

                        {isSearching ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <FlatList
                                data={searchResults}
                                keyExtractor={item => item.id.toString()}
                                style={{ maxHeight: 200 }}
                                renderItem={({ item }) => (
                                    <View style={[styles.searchItem, { borderBottomColor: colors.border }]}>
                                        <View style={styles.searchInfo}>
                                            <Text style={[styles.friendName, { color: colors.text }]}>{item.username}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.addButton, { backgroundColor: colors.primary }]}
                                            onPress={() => sendRequest(item.username)}
                                        >
                                            <Text style={[styles.addButtonText, { color: colors.buttonText }]}>Add</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setIsAddModalVisible(false)} style={[styles.closeButton, { backgroundColor: colors.inputBackground }]}>
                                <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    tabContainer: {
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tabPillContainer: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderRadius: 25,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 20,
    },
    activeTab: {
        backgroundColor: '#1a73e8',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#fff',
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    friendCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#e3f2fd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarInitials: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1976d2',
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    usernameText: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatBtn: {
        backgroundColor: '#e8f0fe',
    },
    deleteBtn: {
        backgroundColor: '#ffebee',
    },
    acceptBtn: {
        backgroundColor: '#4caf50',
    },
    rejectBtn: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1a73e8',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1a73e8',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        paddingBottom: 15,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center',
        color: '#1a1a1a',
    },
    modalInput: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        marginBottom: 15,
        color: '#333',
    },
    searchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    searchInfo: {
        flex: 1,
    },
    addButton: {
        backgroundColor: '#1a73e8',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    modalButtons: {
        marginTop: 20,
        alignItems: 'center',
    },
    closeButton: {
        padding: 10,
    },
    closeButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
});

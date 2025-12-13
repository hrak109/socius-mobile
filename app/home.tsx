import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Dimensions, Image, Modal, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useSession } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 4;
const ITEM_SIZE = width / COLUMN_COUNT;

type AppIcon = {
    id: string;
    label: string;
    iconName: keyof typeof Ionicons.glyphMap;
    color: string;
    route?: string;
    disabled?: boolean;
};

const APPS: AppIcon[] = [
    { id: 'chat', label: 'AI Chat', iconName: 'chatbubbles', color: '#1a73e8', route: '/chat' },
];

export default function HomeScreen() {
    const router = useRouter();
    const { signOut } = useSession();
    const [userInfo, setUserInfo] = useState<any>(null);
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const date = new Date();
    const dateString = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    useEffect(() => {
        const loadUserProfile = async () => {
            try {
                const currentUser = await GoogleSignin.getCurrentUser();
                if (currentUser?.user) {
                    setUserInfo(currentUser.user);
                }
            } catch (error) {
                console.log('Failed to load user profile', error);
            }
        };
        loadUserProfile();
    }, []);

    const handleSignOut = async () => {
        setProfileModalVisible(false);
        await signOut();
    };

    const handlePress = (app: AppIcon) => {
        if (app.disabled) return;
        if (app.route) {
            router.push(app.route as any);
        }
    };

    const handleSearchPress = () => {
        router.push({ pathname: '/chat', params: { model: 'hbb-llama3.2:3b' } });
    };

    const renderItem = ({ item }: { item: AppIcon }) => (
        <View style={styles.appContainer}>
            <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: item.disabled ? '#ccc' : item.color }]}
                onPress={() => handlePress(item)}
                activeOpacity={0.7}
            >
                <Ionicons name={item.iconName} size={30} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.appLabel}>{item.label}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.atAGlance}>
                    <Text style={styles.dateText}>{dateString}</Text>
                    {/* Placeholder for weather or upcoming event if needed */}
                </View>
                <TouchableOpacity style={styles.profileIcon} onPress={() => setProfileModalVisible(true)}>
                    {userInfo?.photo ? (
                        <Image source={{ uri: userInfo.photo }} style={styles.avatarImage} />
                    ) : (
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{userInfo?.name?.charAt(0) || 'H'}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <Modal
                animationType="fade"
                transparent={true}
                visible={profileModalVisible}
                onRequestClose={() => setProfileModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setProfileModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.profilePopup}>
                                <View style={styles.popupHeader}>
                                    {userInfo?.photo ? (
                                        <Image source={{ uri: userInfo.photo }} style={styles.popupAvatar} />
                                    ) : (
                                        <View style={[styles.avatar, { width: 60, height: 60, borderRadius: 30 }]}>
                                            <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold' }}>{userInfo?.name?.charAt(0) || 'H'}</Text>
                                        </View>
                                    )}
                                    <View style={styles.popupInfo}>
                                        <Text style={styles.popupName}>{userInfo?.name || 'User'}</Text>
                                        <Text style={styles.popupEmail}>{userInfo?.email || 'No email'}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                                    <Text style={styles.signOutText}>Sign Out</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <View style={styles.content}>
                <FlatList
                    data={APPS}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.grid}
                    columnWrapperStyle={styles.row}
                />
            </View>

            <View style={styles.dockArea}>
                <TouchableOpacity style={styles.searchBar} onPress={handleSearchPress}>
                    <Ionicons name="logo-google" size={20} color="#555" style={styles.searchIcon} />
                    <View style={styles.searchInputPlaceholder} />
                    <Ionicons name="mic" size={20} color="#555" style={styles.micIcon} />
                    <Ionicons name="camera" size={20} color="#555" style={styles.lensIcon} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingTop: 20,
        marginBottom: 20,
    },
    atAGlance: {
        flexDirection: 'column',
    },
    dateText: {
        fontSize: 24,
        fontWeight: '400',
        color: '#333',
        fontFamily: 'sans-serif', // Try to match system font
    },
    profileIcon: {
        padding: 5,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1a73e8', // Google Blue
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    avatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    content: {
        flex: 1,
    },
    grid: {
        paddingTop: 20,
        paddingHorizontal: 10,
    },
    row: {
        justifyContent: 'flex-start',
    },
    appContainer: {
        width: ITEM_SIZE - 5,
        alignItems: 'center',
        marginBottom: 20,
    },
    iconButton: {
        width: 55,
        height: 55,
        borderRadius: 27.5, // Circle
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    appLabel: {
        color: '#555',
        fontSize: 13,
        fontWeight: '400',
    },
    dockArea: {
        padding: 20,
        paddingBottom: 30, // Extra padding for bottom safe area if needed
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f3f4', // Google Grey
        borderRadius: 30,
        paddingVertical: 12,
        paddingHorizontal: 15,
        elevation: 1,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInputPlaceholder: {
        flex: 1,
        height: 20,
    },
    micIcon: {
        marginLeft: 10,
        marginRight: 15,
    },
    lensIcon: {
        marginRight: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profilePopup: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    popupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    popupAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    popupInfo: {
        marginLeft: 15,
        flex: 1,
    },
    popupName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    popupEmail: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    signOutButton: {
        backgroundColor: '#f1f3f4',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    signOutText: {
        color: '#d93025', // Google Red
        fontWeight: '600',
        fontSize: 16,
    },
});

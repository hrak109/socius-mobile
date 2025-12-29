import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api, { uploadAvatar, deleteAvatar } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import { useSession } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useUserProfile } from '../context/UserProfileContext';
import { PROFILE_AVATARS } from '../constants/avatars';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Local definition removed


export default function ProfileScreen() {
    const router = useRouter();
    const { signOut } = useSession();
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { displayName, displayAvatar, updateProfile } = useUserProfile();

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editUsername, setEditUsername] = useState(''); // NEW
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null); // NEW

    // Google Data
    const [googlePhoto, setGooglePhoto] = useState<string | null>(null);
    const [googleName, setGoogleName] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        loadGoogleProfile();
        if (displayName) setEditName(displayName);
        if (displayAvatar) setSelectedAvatar(displayAvatar);
    }, [displayName, displayAvatar]);

    const loadGoogleProfile = async () => {
        try {
            const currentUser = await GoogleSignin.getCurrentUser();
            if (currentUser?.user) {
                setGooglePhoto(currentUser.user.photo);
                setGoogleName(currentUser.user.name);
                setEmail(currentUser.user.email);
            }
        } catch (error) {
            console.error('Failed to load google profile', error);
        }
    };

    const loadBackendProfile = async () => {
        try {
            const res = await api.get('/users/me');
            if (res.data.username) {
                setUsername(res.data.username);
                setEditUsername(res.data.username);
            }
            if (res.data.custom_avatar_url) {
                // Ensure absolute URL if needed, or handle relative
                const url = res.data.custom_avatar_url.startsWith('http')
                    ? res.data.custom_avatar_url
                    : `${api.defaults.baseURL?.replace('/api/socius', '')}${res.data.custom_avatar_url}`;
                setCustomAvatarUrl(url);
                // If current display avatar is not set or matches previously custom logic, maybe auto-select?
                // For now just load it.
            }
        } catch (error) {
            console.log('Failed to load backend profile');
        }
    };

    useEffect(() => {
        loadBackendProfile();
    }, []);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            try {
                const res = await uploadAvatar(result.assets[0].uri);
                const url = res.url.startsWith('http')
                    ? res.url
                    : `${api.defaults.baseURL?.replace('/api/socius', '')}${res.url}`;
                setCustomAvatarUrl(url);
                // Update context to use this custom avatar?
                // Currently context uses IDs. We might need to support URLs in context.
                // For now, let's just upload. supporting context change is a separate step.
                Alert.alert('Success', 'Avatar uploaded');
            } catch (error) {
                Alert.alert('Error', 'Failed to upload image');
            }
        }
    };

    const handleRemoveCustomAvatar = async () => {
        try {
            await deleteAvatar();
            setCustomAvatarUrl(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to remove avatar');
        }
    };

    const handleSave = async () => {
        if (!editName.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }

        try {
            // Update Context (Display Name & Avatar)
            await updateProfile(editName, selectedAvatar || 'user-1');

            // Update Backend (Username & Role)
            // Note: Context doesn't manage username yet, so we update backend directly here.
            await api.put('/users/me', {
                username: editUsername,
                socius_role: null // Keep existing or load it? Backend handles partial updates? 
                // Investigated socius_api.py: UserUpdate expects username. role is optional.
                // It does NOT do partial updates for username? 
                // Ah, backend code:
                // class UserUpdate(BaseModel):
                //     username: str
                //     socius_role: str = None
                // So we MUST send username.
            });

            setUsername(editUsername);
            setIsEditing(false);
            Alert.alert('Success', 'Profile updated');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to update profile');
        }
    };

    const handleSignOut = async () => {
        Alert.alert(
            t('settings.sign_out'),
            t('settings.sign_out_confirm_message'),
            [
                { text: t('common.cancel'), style: "cancel" },
                {
                    text: t('settings.sign_out'),
                    style: "destructive",
                    onPress: async () => {
                        await signOut();
                        router.replace('/');
                    }
                }
            ]
        );
    };

    // Removed loading state for now as we load local data mostly


    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    {/* Editable Socius Profile Section */}
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>Public Profile</Text>

                    <View style={styles.avatarContainer}>
                        {selectedAvatar && PROFILE_AVATARS.find(a => a.id === selectedAvatar) ? (
                            <Image source={PROFILE_AVATARS.find(a => a.id === selectedAvatar)?.source} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                                <Text style={styles.avatarInitials}>{editName?.charAt(0) || googleName?.charAt(0) || 'U'}</Text>
                            </View>
                        )}
                        <TouchableOpacity style={[styles.editAvatarBtn, { backgroundColor: colors.primary }]} onPress={() => setIsEditing(!isEditing)}>
                            <Ionicons name="pencil" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {isEditing ? (
                        <View style={styles.editContainer}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Display Name</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.primary }]}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Enter display name"
                                placeholderTextColor={colors.textSecondary}
                            />

                            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 15 }]}>User ID (Unique)</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.primary }]}
                                value={editUsername}
                                onChangeText={setEditUsername}
                                placeholder="Enter unique user ID"
                                placeholderTextColor={colors.textSecondary}
                                autoCapitalize="none"
                            />

                            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 15 }]}>Choose Avatar</Text>
                            <View style={styles.avatarGrid}>
                                {PROFILE_AVATARS.map((avatar) => (
                                    <TouchableOpacity
                                        key={avatar.id}
                                        onPress={() => setSelectedAvatar(avatar.id)}
                                        style={[styles.avatarOption, selectedAvatar === avatar.id && { borderColor: colors.primary, borderWidth: 2 }]}
                                    >
                                        <Image source={avatar.source} style={styles.avatarOptionImg} />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.buttonRow}>
                                <TouchableOpacity style={[styles.actionSaveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
                                    <Text style={styles.buttonText}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionCancelButton, { backgroundColor: colors.border }]} onPress={() => { setIsEditing(false); setEditName(displayName || googleName || ''); setEditUsername(username || ''); }}>
                                    <Text style={styles.buttonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <Text style={[styles.name, { color: colors.text }]}>{displayName || googleName || 'User'}</Text>
                            {username && <Text style={[styles.username, { color: colors.textSecondary }]}>@{username}</Text>}
                            <TouchableOpacity onPress={() => setIsEditing(true)}>
                                <Text style={{ color: colors.primary, marginTop: 5 }}>Edit Profile</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 20 }]} />

                    {/* Read-Only Google Info */}
                    <Text style={[styles.sectionHeader, { color: colors.text, marginBottom: 15 }]}>Google Account</Text>
                    <View style={styles.googleInfoRow}>
                        {googlePhoto && <Image source={{ uri: googlePhoto }} style={styles.googleAvatar} />}
                        <View>
                            <Text style={[styles.googleName, { color: colors.text }]}>{googleName}</Text>
                            <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text>
                        </View>
                    </View>

                    {/* Custom Avatar Upload */}
                    <Text style={[styles.sectionHeader, { color: colors.text, marginBottom: 15, marginTop: 20 }]}>Custom Photo</Text>
                    <View style={styles.uploadRow}>
                        {customAvatarUrl ? (
                            <Image source={{ uri: customAvatarUrl }} style={styles.customAvatarPreview} />
                        ) : (
                            <View style={[styles.customAvatarPreview, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                                <Ionicons name="person" size={30} color={colors.textSecondary} />
                            </View>
                        )}
                        <View style={styles.uploadButtons}>
                            <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: colors.primary }]} onPress={handlePickImage}>
                                <Text style={styles.buttonText}>Upload Photo</Text>
                            </TouchableOpacity>
                            {customAvatarUrl && (
                                <TouchableOpacity style={[styles.removeBtn, { backgroundColor: colors.danger }]} onPress={handleRemoveCustomAvatar}>
                                    <Text style={styles.buttonText}>Remove</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>


                <TouchableOpacity
                    style={[styles.signOutButton, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
                    onPress={handleSignOut}
                >
                    <Ionicons name="log-out-outline" size={24} color={colors.danger} style={{ marginRight: 10 }} />
                    <Text style={[styles.signOutText, { color: colors.danger }]}>{t('settings.sign_out')}</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    card: {
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        fontSize: 40,
        color: '#fff',
        fontWeight: 'bold',
    },
    cameraButtonDisabled: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#ccc', // Disabled look
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    username: {
        fontSize: 16,
        marginBottom: 10,
    },
    email: {
        fontSize: 16,
        marginBottom: 20,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 20,
    },
    section: {
        width: '100%',
        marginBottom: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 12,
    },
    infoText: {
        fontSize: 18,
        fontWeight: '500',
    },
    editIcon: {
        padding: 5,
    },
    editRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        marginRight: 10,
    },
    saveButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    cancelButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    signOutButton: {
        flexDirection: 'row',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    signOutText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    editAvatarBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    editContainer: {
        width: '100%',
    },
    avatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        marginVertical: 10,
    },
    avatarOption: {
        padding: 2,
        borderRadius: 25,
    },
    avatarOptionImg: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
        gap: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
    },
    actionSaveButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    actionCancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    googleInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 10,
        borderRadius: 10,
    },
    googleAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    googleName: {
        fontWeight: '600',
        fontSize: 16,
    },
    uploadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    customAvatarPreview: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    uploadButtons: {
        flex: 1,
        flexDirection: 'row',
        gap: 10,
    },
    uploadBtn: {
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    removeBtn: {
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
});

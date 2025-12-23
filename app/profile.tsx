import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useSession } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function ProfileScreen() {
    const router = useRouter();
    const { signOut } = useSession();
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // User data
    const [userId, setUserId] = useState<number | null>(null);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [googlePhoto, setGooglePhoto] = useState<string | null>(null);
    const [googleName, setGoogleName] = useState<string | null>(null);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [newUsername, setNewUsername] = useState('');

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            // Get Backend Profile
            const response = await api.get('/users/me');
            setUserId(response.data.id);
            setUsername(response.data.username);
            setEmail(response.data.email);
            setNewUsername(response.data.username);

            // Get Google Profile for Photo/Name
            try {
                const currentUser = await GoogleSignin.getCurrentUser();
                if (currentUser?.user) {
                    setGooglePhoto(currentUser.user.photo);
                    setGoogleName(currentUser.user.name);
                }
            } catch (gError) {
                console.log("Google user fetch error", gError);
            }

        } catch (error) {
            console.error('Failed to load profile:', error);
            Alert.alert('Error', 'Failed to load profile data.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newUsername.trim()) {
            Alert.alert('Error', 'Username cannot be empty');
            return;
        }
        if (newUsername === username) {
            setIsEditing(false);
            return;
        }

        setSaving(true);
        try {
            const response = await api.put('/users/me', { username: newUsername });
            setUsername(response.data.username);
            setIsEditing(false);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error: any) {
            console.error('Update failed:', error);
            const msg = error.response?.data?.detail || 'Failed to update profile';
            Alert.alert('Error', msg);
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        await signOut();
                        router.replace('/');
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <View style={styles.avatarContainer}>
                        {googlePhoto ? (
                            <Image source={{ uri: googlePhoto }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                                <Text style={styles.avatarInitials}>{googleName?.charAt(0) || 'U'}</Text>
                            </View>
                        )}
                        <TouchableOpacity style={[styles.cameraButtonDisabled, { borderColor: colors.card }]} activeOpacity={1}>
                            {/* Placeholder for future photo upload feature */}
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.name, { color: colors.text }]}>{googleName || 'User'}</Text>
                    <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.section}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
                        {isEditing ? (
                            <View style={styles.editRow}>
                                <TextInput
                                    style={[styles.input, {
                                        color: colors.text,
                                        backgroundColor: colors.inputBackground,
                                        borderColor: colors.primary
                                    }]}
                                    value={newUsername}
                                    onChangeText={setNewUsername}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholder="Enter username"
                                    placeholderTextColor={colors.textSecondary}
                                />
                                <TouchableOpacity
                                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                    onPress={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Ionicons name="checkmark" size={24} color="#fff" />
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.cancelButton, { backgroundColor: colors.border }]}
                                    onPress={() => {
                                        setIsEditing(false);
                                        setNewUsername(username);
                                    }}
                                    disabled={saving}
                                >
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={[styles.infoRow, { backgroundColor: colors.inputBackground }]}>
                                <Text style={[styles.infoText, { color: colors.text }]}>@{username}</Text>
                                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editIcon}>
                                    <Ionicons name="pencil" size={20} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                </View>

                <TouchableOpacity
                    style={[styles.signOutButton, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
                    onPress={handleSignOut}
                >
                    <Ionicons name="log-out-outline" size={24} color={colors.danger} style={{ marginRight: 10 }} />
                    <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
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
});

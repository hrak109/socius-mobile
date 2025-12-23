import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import { AVATAR_MAP } from '../constants/avatars';

const AVATARS = [
    { id: 'socius-icon', source: AVATAR_MAP['socius-icon'], label: 'Classic' },
    { id: 'socius-avatar-1', source: AVATAR_MAP['socius-avatar-1'], label: 'Bot Friend' },
    { id: 'socius-avatar-2', source: AVATAR_MAP['socius-avatar-2'], label: 'Sparky' },
    { id: 'socius-avatar-3', source: AVATAR_MAP['socius-avatar-3'], label: 'Geo' },
];

export default function SettingsScreen() {
    const router = useRouter();
    const { signOut } = useSession();
    const { theme, toggleTheme, isDark, colors } = useTheme();
    const [selectedAvatar, setSelectedAvatar] = useState('socius-icon');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const avatar = await AsyncStorage.getItem('socius_avatar_preference');
            if (avatar) setSelectedAvatar(avatar);
        } catch (error) {
            console.error('Failed to load settings', error);
        }
    };

    const handleAvatarSelect = async (avatarId: string) => {
        setSelectedAvatar(avatarId);
        try {
            await AsyncStorage.setItem('socius_avatar_preference', avatarId);
        } catch (error) {
            console.error('Failed to save avatar preference', error);
        }
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Socius Appearance Section */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : '#000' }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Socius Appearance</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Choose your companion's look</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarList}>
                        {AVATARS.map((avatar) => (
                            <TouchableOpacity
                                key={avatar.id}
                                style={[
                                    styles.avatarOption,
                                    selectedAvatar === avatar.id && styles.selectedAvatarOption
                                ]}
                                onPress={() => handleAvatarSelect(avatar.id)}
                            >
                                <Image source={avatar.source} style={styles.avatarImage} />
                                {selectedAvatar === avatar.id && (
                                    <View style={styles.checkMark}>
                                        <Ionicons name="checkmark-circle" size={24} color="#1a73e8" />
                                    </View>
                                )}
                                <Text style={[
                                    styles.avatarLabel,
                                    selectedAvatar === avatar.id && styles.selectedAvatarLabel
                                ]}>{avatar.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* General Settings */}
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>General</Text>
                    <View style={[styles.optionRow, { borderBottomColor: colors.border }]}>
                        <View style={styles.optionInfo}>
                            <Ionicons name="moon-outline" size={22} color={colors.textSecondary} />
                            <Text style={[styles.optionText, { color: colors.text }]}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={isDark ? colors.primary : "#f4f3f4"}
                        />
                    </View>
                    <View style={[styles.optionRow, { borderBottomColor: colors.border }]}>
                        <View style={styles.optionInfo}>
                            <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
                            <Text style={[styles.optionText, { color: colors.text }]}>Notifications</Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={notificationsEnabled ? colors.primary : "#f4f3f4"}
                        />
                    </View>
                    <View style={[styles.optionRow, { borderBottomColor: colors.border }]}>
                        <View style={styles.optionInfo}>
                            <Ionicons name="volume-medium-outline" size={22} color={colors.textSecondary} />
                            <Text style={[styles.optionText, { color: colors.text }]}>Sound Effects</Text>
                        </View>
                        <Switch
                            value={soundEnabled}
                            onValueChange={setSoundEnabled}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={soundEnabled ? colors.primary : "#f4f3f4"}
                        />
                    </View>
                </View>

                {/* About & Support */}
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>About & Support</Text>
                    <TouchableOpacity style={[styles.linkRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.linkText, { color: colors.text }]}>Privacy Policy</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.linkRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.linkText, { color: colors.text }]}>Terms of Service</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.linkRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.linkText, { color: colors.text }]}>Help & Feedback</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.linkRow}>
                        <Text style={[styles.linkText, { color: colors.text }]}>Version</Text>
                        <Text style={[styles.versionText, { color: colors.textSecondary }]}>1.0.0 (Beta)</Text>
                    </View>
                </View>

                {/* Account Action */}
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 25,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 5,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 15,
    },
    avatarList: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    avatarOption: {
        alignItems: 'center',
        marginRight: 20,
        position: 'relative',
        opacity: 0.7,
        transform: [{ scale: 0.9 }],
    },
    selectedAvatarOption: {
        opacity: 1,
        transform: [{ scale: 1 }],
    },
    avatarImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    checkMark: {
        position: 'absolute',
        bottom: 20,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    avatarLabel: {
        marginTop: 8,
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    selectedAvatarLabel: {
        color: '#1a73e8',
        fontWeight: '700',
    },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    optionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    optionText: {
        fontSize: 16,
        color: '#444',
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    linkText: {
        fontSize: 16,
        color: '#444',
    },
    versionText: {
        fontSize: 14,
        color: '#999',
    },
    signOutButton: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    signOutText: {
        color: '#d93025',
        fontSize: 16,
        fontWeight: '600',
    },
});

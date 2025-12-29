import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api from '../services/api';

type UserProfileContextType = {
    displayName: string | null;
    username: string | null;
    displayAvatar: string | null;
    sociusRole: string | null;
    updateProfile: (name: string, avatarId: string) => Promise<void>;
    updateSociusRole: (role: string) => Promise<void>;
    isLoading: boolean;
};

const UserProfileContext = createContext<UserProfileContextType>({
    displayName: null,
    username: null,
    displayAvatar: null,
    sociusRole: null,
    updateProfile: async () => { },
    updateSociusRole: async () => { },
    isLoading: true,
});

export const useUserProfile = () => useContext(UserProfileContext);

export const UserProfileProvider = ({ children }: { children: React.ReactNode }) => {
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [displayAvatar, setDisplayAvatar] = useState<string | null>(null);
    const [sociusRole, setSociusRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            // Fetch from API for source of truth
            try {
                const res = await api.get('/users/me');
                const data = res.data;
                setDisplayName(data.display_name || data.username);
                setUsername(data.username);
                setDisplayAvatar(data.custom_avatar_url || 'user-1');
                setSociusRole(data.socius_role);

                // Sync to storage
                await AsyncStorage.setItem('user_display_name', data.display_name || data.username || '');
                if (data.username) await AsyncStorage.setItem('user_username', data.username); // Store username
                if (data.custom_avatar_url) await AsyncStorage.setItem('user_display_avatar', data.custom_avatar_url);
                if (data.socius_role) await AsyncStorage.setItem('user_socius_role', data.socius_role);
            } catch (apiError) {
                // Fallback to offline storage if API fails
                console.log('API load failed, using cache');
                const name = await AsyncStorage.getItem('user_display_name');
                const savedUsername = await AsyncStorage.getItem('user_username');
                const avatar = await AsyncStorage.getItem('user_display_avatar');
                const role = await AsyncStorage.getItem('user_socius_role');

                if (name) setDisplayName(name);
                if (savedUsername) setUsername(savedUsername);
                if (avatar) setDisplayAvatar(avatar);
                if (role) setSociusRole(role);
            }
        } catch (error) {
            console.error('Failed to load user profile', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateProfile = async (name: string, avatarId: string) => {
        try {
            if (!username) throw new Error("Username missing");
            await api.put('/users/me', {
                username: username,
                display_name: name,
                custom_avatar_url: avatarId
                // role and language should be preserved? API updates only fields present?
                // Our API implementation: "if update.display_name is not None: user.display_name = ..."
                // So partial updates work if we send fields, but Pydantic model requires `username`.
                // We must ensure we don't accidentally wipe others?
                // `custom_avatar_url` is handled by `upload_avatar` endpoint usually?
                // Wait, `UserUpdate` has `custom_avatar_url: str | None = None`.
                // So we can update it here.
            });

            await AsyncStorage.setItem('user_display_name', name);
            await AsyncStorage.setItem('user_display_avatar', avatarId);
            setDisplayName(name);
            setDisplayAvatar(avatarId);
        } catch (error) {
            console.error('Failed to save user profile', error);
            throw error;
        }
    };

    const updateSociusRole = async (role: string) => {
        try {
            if (!username) throw new Error("Username missing");
            await api.put('/users/me', {
                username: username,
                socius_role: role
            });

            await AsyncStorage.setItem('user_socius_role', role);
            setSociusRole(role);
        } catch (error) {
            console.error('Failed to save socius role', error);
            throw error;
        }
    };

    return (
        <UserProfileContext.Provider value={{ displayName, username, displayAvatar, sociusRole, updateProfile, updateSociusRole, isLoading }}>
            {children}
        </UserProfileContext.Provider>
    );
};

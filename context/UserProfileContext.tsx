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
            // 1. Load from cache immediately
            const name = await AsyncStorage.getItem('user_display_name');
            const savedUsername = await AsyncStorage.getItem('user_username');
            const avatar = await AsyncStorage.getItem('user_display_avatar');
            const role = await AsyncStorage.getItem('user_socius_role');

            if (name) setDisplayName(name);
            if (savedUsername) setUsername(savedUsername);
            if (avatar) setDisplayAvatar(avatar);
            if (role) setSociusRole(role);

            // If we have data, we can stop loading visually
            if (name || savedUsername) {
                setIsLoading(false);
            }

            // 2. Fetch from API to update/sync in background
            try {
                const res = await api.get('/users/me');
                const data = res.data;

                // Update state with fresh data
                setDisplayName(data.display_name || data.username);
                setUsername(data.username);
                setDisplayAvatar(data.custom_avatar_url || 'user-1');
                setSociusRole(data.socius_role);

                // Sync new data to storage
                await AsyncStorage.setItem('user_display_name', data.display_name || data.username || '');
                if (data.username) await AsyncStorage.setItem('user_username', data.username);
                if (data.custom_avatar_url) await AsyncStorage.setItem('user_display_avatar', data.custom_avatar_url);
                if (data.socius_role) await AsyncStorage.setItem('user_socius_role', data.socius_role);
            } catch (apiError) {
                console.log('API load failed, using cached data');
            }
        } catch (error) {
            console.error('Failed to load user profile', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateProfile = React.useCallback(async (name: string, avatarId: string) => {
        try {
            // Update Backend if username exists (initialized)
            if (username) {
                await api.put('/users/me', {
                    username: username,
                    display_name: name,
                    custom_avatar_url: avatarId
                });
            } else {
                console.warn("UserProfileContext: Username missing, skipping API update in updateProfile. (This is expected during initial setup)");
            }

            // Always update local state
            await AsyncStorage.setItem('user_display_name', name);
            await AsyncStorage.setItem('user_display_avatar', avatarId);
            setDisplayName(name);
            setDisplayAvatar(avatarId);
        } catch (error) {
            console.error('Failed to save user profile', error);
            throw error;
        }
    }, [username]);

    const updateSociusRole = React.useCallback(async (role: string) => {
        try {
            if (username) {
                await api.put('/users/me', {
                    username: username,
                    socius_role: role
                });
            } else {
                console.warn("UserProfileContext: Username missing, skipping API update in updateSociusRole. (Expected during setup)");
            }

            await AsyncStorage.setItem('user_socius_role', role);
            setSociusRole(role);
        } catch (error) {
            console.error('Failed to save socius role', error);
            throw error;
        }
    }, [username]);

    const value = React.useMemo(() => ({
        displayName,
        username,
        displayAvatar,
        sociusRole,
        updateProfile,
        updateSociusRole,
        isLoading
    }), [displayName, username, displayAvatar, sociusRole, updateProfile, updateSociusRole, isLoading]);

    return (
        <UserProfileContext.Provider value={value}>
            {children}
        </UserProfileContext.Provider>
    );
};

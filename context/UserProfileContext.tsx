import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserProfileContextType = {
    displayName: string | null;
    displayAvatar: string | null;
    updateProfile: (name: string, avatarId: string) => Promise<void>;
    isLoading: boolean;
};

const UserProfileContext = createContext<UserProfileContextType>({
    displayName: null,
    displayAvatar: null,
    updateProfile: async () => { },
    isLoading: true,
});

export const useUserProfile = () => useContext(UserProfileContext);

export const UserProfileProvider = ({ children }: { children: React.ReactNode }) => {
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [displayAvatar, setDisplayAvatar] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const name = await AsyncStorage.getItem('user_display_name');
            const avatar = await AsyncStorage.getItem('user_display_avatar');
            if (name) setDisplayName(name);
            if (avatar) setDisplayAvatar(avatar);
        } catch (error) {
            console.error('Failed to load user profile', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateProfile = async (name: string, avatarId: string) => {
        try {
            await AsyncStorage.setItem('user_display_name', name);
            await AsyncStorage.setItem('user_display_avatar', avatarId);
            setDisplayName(name);
            setDisplayAvatar(avatarId);
        } catch (error) {
            console.error('Failed to save user profile', error);
            throw error;
        }
    };

    return (
        <UserProfileContext.Provider value={{ displayName, displayAvatar, updateProfile, isLoading }}>
            {children}
        </UserProfileContext.Provider>
    );
};

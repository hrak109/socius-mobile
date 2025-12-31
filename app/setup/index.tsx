import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, TextInput, Animated, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { useSession } from '../../context/AuthContext';
import { SOCIUS_AVATAR_MAP, PROFILE_AVATAR_MAP } from '../../constants/avatars';
import api from '../../services/api';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { loginWithGoogle } from '../../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STEPS = {
    LANGUAGE: 0,
    LOGIN: 1,
    RESTORE: 2,
    SOCIUS_AVATAR: 3,
    USER_NAME: 4,
    USER_AVATAR: 5,
    ROLE: 6,
};

export default function SetupScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { language, setLanguage, t } = useLanguage();
    const { colors, setAvatar } = useTheme();
    const { updateProfile, updateSociusRole } = useUserProfile();
    const { signIn } = useSession();

    const [step, setStep] = useState(STEPS.LANGUAGE);
    const [selectedSociusAvatar, setSelectedSociusAvatar] = useState('socius-avatar-0');
    const [userName, setUserName] = useState('');
    const [selectedUserAvatar, setSelectedUserAvatar] = useState('user-1');
    const [selectedRole, setSelectedRole] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSigninInProgress, setIsSigninInProgress] = useState(false);
    const [existingUsername, setExistingUsername] = useState<string | null>(null);
    const [isExistingUser, setIsExistingUser] = useState(false);
    // const [restoreData, setRestoreData] = useState<any>(null); // Not strictly needed if we just fetch and decide

    // Animation values
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Configure Google Sign-In
        GoogleSignin.configure({
            webClientId: '801464542210-b08v4fc2tsk7ma3bfu30jc1frueps1on.apps.googleusercontent.com',
            offlineAccess: false,
            scopes: ['openid', 'profile', 'email'],
        });

        // Handle Entry Point
        if (params.entryPoint === 'settings') {
            setStep(STEPS.SOCIUS_AVATAR);
        }
    }, [params.entryPoint]);


    const fadeIn = () => {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const goToStep = (nextStep: number) => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setStep(nextStep);
            fadeIn();
        });
    };

    const handleGoogleLogin = async () => {
        setIsSigninInProgress(true);
        try {
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();

            if (response.type === 'cancelled') return;

            const idToken = response.data?.idToken;
            if (!idToken) throw new Error('No ID token');

            // Backend Login
            const accessToken = await loginWithGoogle(idToken);
            await signIn(accessToken);

            // Fetch Profile to check for restore
            const res = await api.get('/users/me');
            const userProfile = res.data;

            if (userProfile.socius_role) {
                // Existing user with setup done -> Restore Screen
                // We could pre-fill local state here too
                setIsExistingUser(true);
                setExistingUsername(userProfile.username);
                setUserName(userProfile.display_name || userProfile.username || '');
                if (userProfile.socius_role) setSelectedRole(userProfile.socius_role);
                if (userProfile.language) setLanguage(userProfile.language);
                // Avatar logic matching might be needed if meaningful
                goToStep(STEPS.RESTORE);
            } else {
                // New user or incomplete -> Socius Avatar
                setIsExistingUser(false);
                // Even for new users, backend might have generated a temp username, but we might want to overwrite it 
                // typically. Although user says "if userid already exists... keep". 
                // But userid ALWAYS exists.
                // Interpreting "new users" as "not setup yet".
                goToStep(STEPS.SOCIUS_AVATAR);
            }

        } catch (error: any) {
            console.error('Login Error:', error);
            if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
                Alert.alert('Error', 'Login failed');
            }
        } finally {
            setIsSigninInProgress(false);
        }
    };

    const handleRestoreChoice = async (restore: boolean) => {
        if (restore) {
            // Keep settings: Mark setup complete, update context, go home
            setIsSubmitting(true);
            try {
                // Fetch latest again to be sure (or reuse)
                const res = await api.get('/users/me');
                const data = res.data;

                // Restore Context
                // Use display_name if available, else username
                await updateProfile(data.display_name || data.username, data.custom_avatar_url || 'user-1');
                if (data.socius_role) await updateSociusRole(data.socius_role);

                // Mark Setup Complete
                await AsyncStorage.setItem('setup_complete', 'true');

                router.replace('/home');
            } catch (e) {
                console.error(e);
                Alert.alert('Error', 'Failed to restore settings');
            } finally {
                setIsSubmitting(false);
            }
        } else {
            // Change settings -> Continue setup
            goToStep(STEPS.SOCIUS_AVATAR);
        }
    };

    const handleFinish = async () => {
        if (!selectedRole) return;
        setIsSubmitting(true);
        try {
            // Context: userName is treated as Display Name
            await updateProfile(userName, selectedUserAvatar);
            await updateSociusRole(selectedRole);

            // Generate "Unique ID" based on input ONLY if new user
            // If existing user, we KEEP the existing username (unique ID)
            let newUsername = existingUsername;

            if (!isExistingUser || !newUsername) {
                // Format: name + 4 random digits
                // Allow unicode characters by only stripping whitespace
                const cleanName = userName.replace(/\s+/g, '').toLowerCase();
                const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                newUsername = `${cleanName}${randomSuffix}`;
            }

            // Update Backend
            // We send display_name (the input) AND the generated unique username
            await api.put('/users/me', {
                display_name: userName,
                username: newUsername,
                socius_role: selectedRole,
                language: language // Send current language
            });

            // Mark Setup Complete
            await AsyncStorage.setItem('setup_complete', 'true');

            router.replace('/home');
        } catch (error: any) {
            console.error('[Setup] Error in handleFinish:', error);
            const msg = error.response?.data?.detail || error.message || 'Failed to complete setup';
            Alert.alert('Error', msg);
        } finally {
            setIsSubmitting(false);
        }
    };


    // Step Renders
    const renderLanguage = () => (
        <View style={styles.stepContainer}>
            <Ionicons name="globe-outline" size={60} color={colors.primary} style={{ marginBottom: 20 }} />
            <Text style={[styles.title, { color: colors.text }]}>{t('setup.language_select')}</Text>

            <View style={styles.languageContainer}>
                <TouchableOpacity
                    style={[styles.langButton, language === 'en' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setLanguage('en')}
                >
                    <Text style={[styles.langText, { color: language === 'en' ? '#fff' : colors.text }]}>English</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.langButton, language === 'ko' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setLanguage('ko')}
                >
                    <Text style={[styles.langText, { color: language === 'ko' ? '#fff' : colors.text }]}>한국어</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.nextButton, { backgroundColor: colors.primary }]} onPress={() => goToStep(STEPS.LOGIN)}>
                <Text style={styles.nextButtonText}>{t('setup.next')}</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    const renderLogin = () => (
        <View style={styles.stepContainer}>
            <Ionicons name="log-in-outline" size={60} color={colors.primary} style={{ marginBottom: 20 }} />
            <Text style={[styles.title, { color: colors.text }]}>{t('setup.please_sign_in')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('setup.welcome')}</Text>

            <TouchableOpacity
                style={[styles.googleButton]}
                onPress={handleGoogleLogin}
                disabled={isSigninInProgress}
            >
                {isSigninInProgress ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Ionicons name="logo-google" size={24} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.googleButtonText}>{t('setup.sign_in_google')}</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderRestore = () => (
        <View style={styles.stepContainer}>
            <Ionicons name="refresh-circle-outline" size={60} color={colors.primary} style={{ marginBottom: 20 }} />
            <Text style={[styles.title, { color: colors.text }]}>{t('setup.restore_title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('setup.restore_message')}</Text>

            <TouchableOpacity style={[styles.restoreButton, { backgroundColor: colors.primary }]} onPress={() => handleRestoreChoice(true)}>
                <Text style={styles.restoreButtonText}>{t('setup.keep_settings')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.textButton]} onPress={() => handleRestoreChoice(false)}>
                <Text style={[styles.textButtonText, { color: colors.textSecondary }]}>{t('setup.change_settings')}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderSociusAvatar = () => (
        <View style={styles.stepContainer}>
            <Text style={[styles.prompt, { color: colors.text }]}>{t('setup.socius_look_prompt')}</Text>

            <View style={styles.grid}>
                {['socius-avatar-0', 'socius-avatar-1', 'socius-avatar-2', 'socius-avatar-3'].map((id) => (
                    <TouchableOpacity
                        key={id}
                        style={[styles.avatarOption, selectedSociusAvatar === id && { borderColor: colors.primary, borderWidth: 3 }]}
                        onPress={() => setSelectedSociusAvatar(id)}
                    >
                        <Image source={SOCIUS_AVATAR_MAP[id]} style={styles.avatarImage} />
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.previewContainer}>
                <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>Preview</Text>
                <Image source={SOCIUS_AVATAR_MAP[selectedSociusAvatar]} style={styles.previewImage} />
            </View>

            <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                    setAvatar(selectedSociusAvatar); // Set theme avatar
                    goToStep(STEPS.USER_NAME);
                }}
            >
                <Text style={styles.nextButtonText}>{t('setup.next')}</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    const renderUserName = () => (
        <View style={styles.stepContainer}>
            <Image source={SOCIUS_AVATAR_MAP[selectedSociusAvatar]} style={[styles.avatarSmall, { marginBottom: 20 }]} />
            <Text style={[styles.prompt, { color: colors.text }]}>{t('setup.user_name_prompt')}</Text>

            <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder={t('setup.name_placeholder')}
                placeholderTextColor={colors.textSecondary}
                value={userName}
                onChangeText={setUserName}

            />

            <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: userName.length > 0 ? colors.primary : colors.border }]}
                disabled={userName.length === 0}
                onPress={() => goToStep(STEPS.USER_AVATAR)}
            >
                <Text style={styles.nextButtonText}>{t('setup.next')}</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    const renderUserAvatar = () => (
        <View style={styles.stepContainer}>
            <Text style={[styles.prompt, { color: colors.text }]}>{t('setup.user_look_prompt')}</Text>

            <View style={styles.grid}>
                {['user-1', 'user-2', 'user-3'].map((id) => (
                    <TouchableOpacity
                        key={id}
                        style={[styles.avatarOption, selectedUserAvatar === id && { borderColor: colors.primary, borderWidth: 3 }]}
                        onPress={() => setSelectedUserAvatar(id)}
                    >
                        <Image source={PROFILE_AVATAR_MAP[id]} style={styles.avatarImage} />
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: colors.primary }]}
                onPress={() => goToStep(STEPS.ROLE)}
            >
                <Text style={styles.nextButtonText}>{t('setup.next')}</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    const renderRole = () => {
        const roles = [
            { id: 'faith_companion', label: t('setup.roles.faith_companion'), icon: 'add' },
            { id: 'friend', label: t('setup.roles.friend'), icon: 'people' },
            { id: 'partner', label: t('setup.roles.partner'), icon: 'heart' },
            { id: 'assistant', label: t('setup.roles.assistant'), icon: 'briefcase' },
        ];

        return (
            <View style={styles.stepContainer}>
                <Text style={[styles.prompt, { color: colors.text }]}>
                    {t('setup.nice_to_meet').replace('{{name}}', userName)}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('setup.role_prompt')}</Text>

                <View style={styles.roleList}>
                    {roles.map((role) => (
                        <TouchableOpacity
                            key={role.id}
                            style={[
                                styles.roleButton,
                                { backgroundColor: colors.card, borderColor: colors.border },
                                selectedRole === role.id && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                            ]}
                            onPress={() => setSelectedRole(role.id)}
                        >
                            <Ionicons name={role.icon as any} size={24} color={selectedRole === role.id ? colors.primary : colors.textSecondary} />
                            <Text style={[
                                styles.roleText,
                                { color: colors.text },
                                selectedRole === role.id && { color: colors.primary, fontWeight: 'bold' }
                            ]}>{role.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.nextButton, { backgroundColor: selectedRole ? colors.primary : colors.border }]}
                    disabled={!selectedRole || isSubmitting}
                    onPress={handleFinish}
                >
                    <Text style={styles.nextButtonText}>{isSubmitting ? t('common.loading') : t('setup.finish')}</Text>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                    if (params.entryPoint === 'settings') {
                        router.back();
                        return;
                    }
                    if (step > 0 && step !== STEPS.RESTORE) goToStep(step - 1); // Can't go back from Restore to login easily without logout, but step - 1 works logic wise
                    else if (step === STEPS.LANGUAGE) router.back(); // Exit setup if at start (though typically this is root)
                    else if (step === STEPS.RESTORE) goToStep(STEPS.LOGIN); // Optional handling
                    else router.back();
                }}>
                    <Ionicons name={params.entryPoint === 'settings' ? "close" : "arrow-back"} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('setup.title')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {step === STEPS.LANGUAGE && renderLanguage()}
                {step === STEPS.LOGIN && renderLogin()}
                {step === STEPS.RESTORE && renderRestore()}
                {step === STEPS.SOCIUS_AVATAR && renderSociusAvatar()}
                {step === STEPS.USER_NAME && renderUserName()}
                {step === STEPS.USER_AVATAR && renderUserAvatar()}
                {step === STEPS.ROLE && renderRole()}
            </Animated.View>

            {/* Progress Dots - Hide for Language/Login/Restore */}
            {step > STEPS.RESTORE && (
                <View style={styles.progressContainer}>
                    {Object.keys(STEPS).filter(k => STEPS[k as keyof typeof STEPS] > STEPS.RESTORE).map((_, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.dot,
                                { backgroundColor: (idx + STEPS.RESTORE + 1) === step ? colors.primary : colors.border }
                            ]}
                        />
                    ))}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    stepContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 30,
        textAlign: 'center',
    },
    prompt: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
    },
    languageContainer: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 40,
    },
    langButton: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    langText: {
        fontSize: 16,
        fontWeight: '600',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
        gap: 10,
        marginTop: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3.84,
        elevation: 5,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    googleButton: {
        flexDirection: 'row',
        backgroundColor: '#4285F4',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 5,
        elevation: 3,
        minWidth: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    restoreButton: {
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
        marginTop: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3.84,
        elevation: 5,
        width: '100%',
        alignItems: 'center',
    },
    restoreButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    textButton: {
        marginTop: 20,
        padding: 10,
    },
    textButtonText: {
        fontSize: 16,
        textDecorationLine: 'underline',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 15,
        marginBottom: 30,
    },
    avatarOption: {
        padding: 2,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarSmall: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    previewContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    previewImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    input: {
        width: '100%',
        padding: 15,
        fontSize: 18,
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 30,
        textAlign: 'center',
    },
    roleList: {
        width: '100%',
        gap: 10,
        marginBottom: 30,
    },
    roleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        gap: 15,
    },
    roleText: {
        fontSize: 18,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingBottom: 20,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    }
});

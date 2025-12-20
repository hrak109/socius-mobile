import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Image, Modal, TouchableWithoutFeedback, Animated, Easing, PanResponder, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useSession } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

type AppIcon = {
    id: string;
    label: string;
    iconName: keyof typeof Ionicons.glyphMap;
    color: string;
    route?: string;
    disabled?: boolean;
    initialX: number;
    initialY: number;
};

const APPS: AppIcon[] = [
    { id: 'chat', label: 'Messages', iconName: 'chatbubbles', color: '#1a73e8', route: '/chat', initialX: width * 0.15, initialY: height * 0.25 },
    { id: 'diary', label: 'Diary', iconName: 'book', color: '#34a853', route: '/diary', initialX: width * 0.65, initialY: height * 0.35 },
    { id: 'bible', label: 'Bible', iconName: 'library', color: '#fbbc04', route: '/bible', initialX: width * 0.4, initialY: height * 0.55 },
];

export default function HomeScreen() {
    const router = useRouter();
    const { signOut } = useSession();
    const [userInfo, setUserInfo] = useState<any>(null);
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const date = new Date();
    const dateString = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    // Floating animation
    const floatAnim = useRef(new Animated.Value(0)).current;

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

        // Start floating animation
        const float = () => {
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ]).start(() => float());
        };
        float();
    }, [floatAnim]);

    const translateY = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -15],
    });

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

    const AppIconComponent = ({ app }: { app: AppIcon }) => {
        const pan = useRef(new Animated.ValueXY()).current;
        const [isLoaded, setIsLoaded] = useState(false);
        const isDragging = useRef(false);

        useEffect(() => {
            // Load saved position
            const loadPosition = async () => {
                try {
                    const saved = await AsyncStorage.getItem(`icon_pos_${app.id}`);
                    if (saved) {
                        const pos = JSON.parse(saved);
                        pan.setValue({ x: 0, y: 0 });
                        pan.setOffset({ x: pos.x, y: pos.y });
                    } else {
                        pan.setValue({ x: 0, y: 0 });
                        pan.setOffset({ x: app.initialX, y: app.initialY });
                    }
                } catch (error) {
                    pan.setValue({ x: 0, y: 0 });
                    pan.setOffset({ x: app.initialX, y: app.initialY });
                }
                setIsLoaded(true);
            };
            loadPosition();
        }, []);

        const panResponder = useRef(
            PanResponder.create({
                onStartShouldSetPanResponderCapture: (evt, gestureState) => {
                    // Check if touch is on drag handle area (top-right corner)
                    const touchX = evt.nativeEvent.locationX;
                    const touchY = evt.nativeEvent.locationY;

                    // Icon button is 55x55, drag handle is at top: -8, right: -8, size: 24x24
                    // So drag handle left edge is at 55 - 8 - 24 = 23px from container left
                    // And right edge is at 55 - 8 = 47px from container left
                    const iconSize = 55;
                    const handleSize = 24;
                    const handleOffset = 8;
                    const handleLeft = iconSize - handleOffset - handleSize;
                    const handleRight = iconSize - handleOffset;
                    const handleTop = -handleOffset;
                    const handleBottom = handleTop + handleSize;

                    const isOnHandle = touchX >= handleLeft &&
                        touchX <= handleRight &&
                        touchY >= handleTop &&
                        touchY <= handleBottom;

                    console.log(`${app.label} touch at (${touchX.toFixed(1)}, ${touchY.toFixed(1)}), handle area: [${handleLeft}-${handleRight}, ${handleTop}-${handleBottom}], isOnHandle: ${isOnHandle}`);

                    if (isOnHandle) {
                        isDragging.current = true;
                    }
                    return isOnHandle;
                },
                onMoveShouldSetPanResponder: () => isDragging.current,
                onPanResponderGrant: () => {
                    isDragging.current = true;
                    // Fix the jump by properly flattening before starting new drag
                    pan.setOffset({
                        x: (pan.x as any)._value + (pan.x as any)._offset,
                        y: (pan.y as any)._value + (pan.y as any)._offset
                    });
                    pan.setValue({ x: 0, y: 0 });
                },
                onPanResponderMove: Animated.event(
                    [null, { dx: pan.x, dy: pan.y }],
                    { useNativeDriver: false }
                ),
                onPanResponderRelease: async () => {
                    // Calculate final position before flattening
                    const finalX = (pan.x as any)._value + (pan.x as any)._offset;
                    const finalY = (pan.y as any)._value + (pan.y as any)._offset;

                    pan.flattenOffset();
                    isDragging.current = false;

                    // Save position
                    try {
                        await AsyncStorage.setItem(`icon_pos_${app.id}`, JSON.stringify({ x: finalX, y: finalY }));
                        console.log(`Saved position for ${app.id}:`, { x: finalX, y: finalY });
                    } catch (error) {
                        console.log('Failed to save position', error);
                    }
                },
            })
        ).current;

        if (!isLoaded) {
            return null; // Don't render until position is loaded
        }

        return (
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.appIconContainer,
                    {
                        transform: [
                            { translateX: pan.x },
                            { translateY: Animated.add(pan.y, translateY) }
                        ]
                    }
                ]}
            >
                <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: app.color }]}
                    onPress={() => handlePress(app)}
                    activeOpacity={0.7}
                >
                    <Ionicons name={app.iconName} size={30} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.appLabel} pointerEvents="none">{app.label}</Text>

                {/* Drag Handle - Visual indicator only */}
                <View style={styles.dragHandle} pointerEvents="none">
                    <Ionicons name="ellipsis-vertical" size={12} color="#666" />
                </View>
            </Animated.View>
        );
    };

    const DraggableAvatar = ({ type }: { type: 'me' | 'socius' }) => {
        const initialPos = type === 'me'
            ? { x: width * 0.2, y: height * 0.35 }
            : { x: width * 0.55, y: height * 0.45 };
        const pan = useRef(new Animated.ValueXY()).current;
        const isDragging = useRef(false);
        const avatarSize = type === 'socius' ? 80 : 40;
        const [isLoaded, setIsLoaded] = useState(false);

        useEffect(() => {
            // Load saved position
            const loadPosition = async () => {
                try {
                    const saved = await AsyncStorage.getItem(`avatar_pos_${type}`);
                    if (saved) {
                        const pos = JSON.parse(saved);
                        pan.setValue({ x: 0, y: 0 });
                        pan.setOffset({ x: pos.x, y: pos.y });
                    } else {
                        pan.setValue({ x: 0, y: 0 });
                        pan.setOffset(initialPos);
                    }
                } catch (error) {
                    pan.setValue({ x: 0, y: 0 });
                    pan.setOffset(initialPos);
                }
                setIsLoaded(true);
            };
            loadPosition();
        }, []);

        const panResponder = useRef(
            PanResponder.create({
                onStartShouldSetPanResponderCapture: (evt, gestureState) => {
                    // Check if touch is on drag handle area
                    const touchX = evt.nativeEvent.locationX;
                    const touchY = evt.nativeEvent.locationY;

                    // Drag handle is at top-right corner
                    const handleLeft = avatarSize - 16;
                    const handleTop = -8;
                    const handleSize = 32;

                    const isOnHandle = touchX >= handleLeft &&
                        touchX <= handleLeft + handleSize &&
                        touchY >= handleTop &&
                        touchY <= handleTop + handleSize;

                    if (isOnHandle) {
                        isDragging.current = true;
                    }
                    return isOnHandle;
                },
                onMoveShouldSetPanResponder: () => isDragging.current,
                onPanResponderGrant: () => {
                    isDragging.current = true;
                    // Fix the jump by properly flattening before starting new drag
                    pan.setOffset({
                        x: (pan.x as any)._value + (pan.x as any)._offset,
                        y: (pan.y as any)._value + (pan.y as any)._offset
                    });
                    pan.setValue({ x: 0, y: 0 });
                },
                onPanResponderMove: Animated.event(
                    [null, { dx: pan.x, dy: pan.y }],
                    { useNativeDriver: false }
                ),
                onPanResponderRelease: async () => {
                    // Calculate final position before flattening
                    const finalX = (pan.x as any)._value + (pan.x as any)._offset;
                    const finalY = (pan.y as any)._value + (pan.y as any)._offset;

                    pan.flattenOffset();
                    isDragging.current = false;

                    // Save position
                    try {
                        await AsyncStorage.setItem(`avatar_pos_${type}`, JSON.stringify({ x: finalX, y: finalY }));
                        console.log(`Saved avatar position for ${type}:`, { x: finalX, y: finalY });
                    } catch (error) {
                        console.log('Failed to save avatar position', error);
                    }
                },
            })
        ).current;

        if (!isLoaded) {
            return null; // Don't render until position is loaded
        }

        return (
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.avatarContainer,
                    {
                        transform: [
                            { translateX: pan.x },
                            { translateY: Animated.add(pan.y, translateY) }
                        ]
                    }
                ]}
            >
                {type === 'me' ? (
                    <>
                        <View style={styles.avatarHead}>
                            <View style={styles.eye} />
                            <View style={[styles.eye, { right: 10 }]} />
                            <View style={styles.smile} />
                        </View>
                        <View style={styles.avatarBody} />
                    </>
                ) : (
                    <Image
                        source={require('../assets/images/socius-icon.png')}
                        style={styles.sociusAvatarImage}
                    />
                )}
                <View style={styles.labelContainer}>
                    <Text style={styles.avatarLabel} pointerEvents="none">{type === 'me' ? 'Me' : 'Socius'}</Text>
                </View>

                {/* Drag Handle - Visual indicator only */}
                <View style={styles.dragHandle} pointerEvents="none">
                    <Ionicons name="ellipsis-vertical" size={12} color="#666" />
                </View>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <View style={styles.header}>
                <View style={styles.atAGlance}>
                    <Text style={styles.dateText}>{dateString}</Text>
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

            {/* Room Environment */}
            <View style={styles.roomContent}>
                {/* Wall */}
                <View style={styles.wall} />

                {/* Floor with wood planks */}
                <View style={styles.floor}>
                    <View style={styles.woodPlank} />
                    <View style={[styles.woodPlank, { top: '12%' }]} />
                    <View style={[styles.woodPlank, { top: '24%' }]} />
                    <View style={[styles.woodPlank, { top: '36%' }]} />
                    <View style={[styles.woodPlank, { top: '48%' }]} />
                    <View style={[styles.woodPlank, { top: '60%' }]} />
                    <View style={[styles.woodPlank, { top: '72%' }]} />
                    <View style={[styles.woodPlank, { top: '84%' }]} />
                </View>

                {/* Door */}
                <View style={styles.door}>
                    <View style={styles.doorFrame} />
                    <View style={styles.doorKnob} />
                    <View style={styles.doorPanel} />
                </View>

                {/* Desk Area */}
                <View style={styles.deskArea}>
                    <View style={styles.deskTop} />
                    <View style={styles.deskLeg} />
                    <View style={[styles.deskLeg, { right: 0 }]} />
                    <View style={styles.computer}>
                        <View style={styles.screen} />
                    </View>
                </View>

                {/* Bed Area */}
                <View style={styles.bedArea}>
                    <View style={styles.bedFrame} />
                    <View style={styles.mattress} />
                    <View style={styles.pillow} />
                    <View style={styles.blanket} />
                </View>

                {/* Chair */}
                <View style={styles.chair}>
                    <View style={styles.chairBack} />
                    <View style={styles.chairSeat} />
                    <View style={styles.chairLeg} />
                    <View style={[styles.chairLeg, { right: 0 }]} />
                </View>

                {/* Closet */}
                <View style={styles.closet}>
                    <View style={styles.closetDoor} />
                    <View style={[styles.closetDoor, { left: '50%' }]} />
                    <View style={styles.closetHandle} />
                    <View style={[styles.closetHandle, { left: '70%' }]} />
                </View>

                {/* Lamp */}
                <View style={styles.lamp}>
                    <View style={styles.lampShade} />
                    <View style={styles.lampBase} />
                </View>

                {/* Rug */}
                <View style={styles.rug} />

                {/* Window */}
                <View style={styles.window}>
                    <View style={styles.windowPane} />
                    <View style={[styles.windowPane, { left: '50%' }]} />
                </View>

                {/* Floating Avatars */}
                <DraggableAvatar type="me" />
                <DraggableAvatar type="socius" />

                {/* Draggable App Icons */}
                {APPS.map(app => (
                    <AppIconComponent key={app.id} app={app} />
                ))}
            </View>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingTop: 50,
        paddingBottom: 10,
        backgroundColor: 'transparent',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
    },
    atAGlance: {
        flexDirection: 'column',
    },
    dateText: {
        fontSize: 24,
        fontWeight: '400',
        color: '#333',
    },
    profileIcon: {
        padding: 5,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1a73e8',
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
        color: '#d93025',
        fontWeight: '600',
        fontSize: 16,
    },
    roomContent: {
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
    },
    wall: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '55%',
        backgroundColor: '#f5f5dc',
        zIndex: 1,
    },
    floor: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '45%',
        backgroundColor: '#8b7355',
        zIndex: 1,
    },
    woodPlank: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: '11%',
        backgroundColor: '#a0826d',
        borderBottomWidth: 1,
        borderBottomColor: '#654321',
    },
    deskArea: {
        position: 'absolute',
        left: '5%',
        bottom: '18%',
        width: 120,
        height: 90,
        zIndex: 2,
    },
    deskTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 12,
        backgroundColor: '#8d6e63',
        borderRadius: 4,
    },
    deskLeg: {
        position: 'absolute',
        top: 12,
        width: 8,
        height: 70,
        backgroundColor: '#5d4037',
        left: 5,
    },
    computer: {
        position: 'absolute',
        top: -25,
        left: 30,
        alignItems: 'center',
    },
    screen: {
        width: 50,
        height: 35,
        backgroundColor: '#1976d2',
        borderRadius: 4,
        borderWidth: 3,
        borderColor: '#333',
    },
    bedArea: {
        position: 'absolute',
        right: '8%',
        bottom: '10%',
        width: 140,
        height: 100,
        zIndex: 2,
    },
    bedFrame: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 18,
        backgroundColor: '#3e2723',
        borderRadius: 4,
    },
    mattress: {
        position: 'absolute',
        bottom: 10,
        width: '100%',
        height: 35,
        backgroundColor: '#fff',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    pillow: {
        position: 'absolute',
        top: 70,
        left: 10,
        width: 40,
        height: 25,
        backgroundColor: '#e0e0e0',
        borderRadius: 10,
    },
    blanket: {
        position: 'absolute',
        bottom: 20,
        right: 0,
        width: '70%',
        height: 50,
        backgroundColor: '#90caf9',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 4,
    },
    appIconContainer: {
        position: 'absolute',
        alignItems: 'center',
        zIndex: 1000,
    },
    iconButton: {
        width: 55,
        height: 55,
        borderRadius: 27.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    appLabel: {
        color: '#333',
        fontSize: 13,
        fontWeight: '500',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    avatarContainer: {
        position: 'absolute',
        alignItems: 'center',
        zIndex: 1000,
    },
    avatarHead: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffccbc',
        position: 'relative',
    },
    eye: {
        position: 'absolute',
        top: 15,
        left: 10,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#333',
    },
    smile: {
        position: 'absolute',
        bottom: 8,
        left: 15,
        width: 10,
        height: 5,
        borderBottomWidth: 2,
        borderBottomColor: '#333',
        borderRadius: 5,
    },
    avatarBody: {
        width: 30,
        height: 40,
        backgroundColor: '#1a73e8',
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        marginTop: -5,
    },
    labelContainer: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginTop: 5,
    },
    avatarLabel: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    sociusAvatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    dragHandle: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    chair: {
        position: 'absolute',
        left: '5%',
        bottom: '12%',
        width: 45,
        height: 55,
        zIndex: 2,
    },
    chairBack: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: 25,
        backgroundColor: '#a0522d',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    chairSeat: {
        position: 'absolute',
        top: 22,
        width: '100%',
        height: 12,
        backgroundColor: '#8b4513',
    },
    chairLeg: {
        position: 'absolute',
        top: 34,
        width: 6,
        height: 20,
        backgroundColor: '#654321',
        left: 4,
    },
    closet: {
        position: 'absolute',
        left: '5%',
        top: '25%',
        width: 70,
        height: 90,
        backgroundColor: '#8b7355',
        borderRadius: 4,
        zIndex: 2,
    },
    closetDoor: {
        position: 'absolute',
        top: 5,
        left: 0,
        width: '48%',
        height: '88%',
        backgroundColor: '#a0826d',
        borderRadius: 2,
        borderWidth: 1,
        borderColor: '#654321',
    },
    closetHandle: {
        position: 'absolute',
        top: '50%',
        left: '22%',
        width: 4,
        height: 10,
        backgroundColor: '#c0c0c0',
        borderRadius: 2,
    },
    lamp: {
        position: 'absolute',
        right: '30%',
        bottom: '22%',
        width: 35,
        height: 45,
        alignItems: 'center',
        zIndex: 2,
    },
    lampShade: {
        width: 32,
        height: 22,
        backgroundColor: '#ffe4b5',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 1,
        borderColor: '#daa520',
    },
    lampBase: {
        width: 7,
        height: 18,
        backgroundColor: '#8b7355',
        borderRadius: 2,
    },
    rug: {
        position: 'absolute',
        left: '28%',
        bottom: '15%',
        width: 110,
        height: 70,
        backgroundColor: '#c19a6b',
        borderRadius: 35,
        borderWidth: 3,
        borderColor: '#8b6914',
        zIndex: 2,
    },
    window: {
        position: 'absolute',
        right: '6%',
        top: '12%',
        width: 85,
        height: 110,
        backgroundColor: '#87ceeb',
        borderWidth: 4,
        borderColor: '#5f4d3b',
        borderRadius: 6,
        zIndex: 2,
    },
    windowPane: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '48%',
        height: '100%',
        borderRightWidth: 2,
        borderRightColor: '#5f4d3b',
    },
    door: {
        position: 'absolute',
        left: '8%',
        bottom: '45%',
        width: 65,
        height: 100,
        zIndex: 2,
    },
    doorFrame: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#654321',
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#4a3319',
    },
    doorPanel: {
        position: 'absolute',
        top: 8,
        left: 4,
        width: '88%',
        height: '38%',
        backgroundColor: '#785a3c',
        borderRadius: 2,
        borderWidth: 1,
        borderColor: '#4a3319',
    },
    doorKnob: {
        position: 'absolute',
        right: 10,
        top: '48%',
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#c0c0c0',
    },
});

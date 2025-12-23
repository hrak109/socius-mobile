import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Image, Animated, PanResponder, TouchableOpacity, Modal, Dimensions, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatInterface from './ChatInterface';
import { usePathname } from 'expo-router';
import { AVATAR_MAP } from '../constants/avatars';

const { width, height } = Dimensions.get('window');

export default function ChatHead() {
    const [modalVisible, setModalVisible] = useState(false);
    const pan = useRef(new Animated.ValueXY()).current;
    const [isLoaded, setIsLoaded] = useState(false);
    const isDragging = useRef(false);
    const pathname = usePathname();
    const [avatarSource, setAvatarSource] = useState(AVATAR_MAP['socius-icon']);

    useEffect(() => {
        const loadState = async () => {
            // Load Position
            try {
                const saved = await AsyncStorage.getItem('chat_head_pos');
                if (saved) {
                    const pos = JSON.parse(saved);
                    pan.setValue({ x: 0, y: 0 });
                    pan.setOffset({ x: pos.x, y: pos.y });
                } else {
                    pan.setValue({ x: 0, y: 0 });
                    pan.setOffset({ x: width - 80, y: height - 150 });
                }
            } catch (e) {
                pan.setValue({ x: 0, y: 0 });
                pan.setOffset({ x: width - 80, y: height - 150 });
            }
            setIsLoaded(true);

            // Load Avatar
            try {
                const savedAvatar = await AsyncStorage.getItem('socius_avatar_preference');
                if (savedAvatar && AVATAR_MAP[savedAvatar]) {
                    setAvatarSource(AVATAR_MAP[savedAvatar]);
                }
            } catch (e) {
                console.log('Failed to load avatar');
            }
        };
        loadState();
    }, [pathname]); // Reload when path changes (e.g. returning from settings)

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                isDragging.current = false;
                pan.setOffset({
                    x: (pan.x as any)._value + (pan.x as any)._offset,
                    y: (pan.y as any)._value + (pan.y as any)._offset
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: (e, gestureState) => {
                if (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2) {
                    isDragging.current = true;
                }
                return Animated.event(
                    [null, { dx: pan.x, dy: pan.y }],
                    { useNativeDriver: false }
                )(e, gestureState);
            },
            onPanResponderRelease: async () => {
                const currentX = (pan.x as any)._value + (pan.x as any)._offset;
                const currentY = (pan.y as any)._value + (pan.y as any)._offset;

                const bubbleSize = 60;
                const margin = 5;

                // Enforce boundaries
                let finalX = currentX;
                let finalY = currentY;

                if (currentX < margin) finalX = margin;
                if (currentX > width - bubbleSize - margin) finalX = width - bubbleSize - margin;
                if (currentY < margin + 30) finalY = margin + 30; // Top margin + status bar approx
                if (currentY > height - bubbleSize - margin - 20) finalY = height - bubbleSize - margin - 20;

                pan.flattenOffset();

                // Animate to bound if needed
                if (finalX !== currentX || finalY !== currentY) {
                    Animated.spring(pan, {
                        toValue: { x: finalX, y: finalY },
                        useNativeDriver: false,
                        friction: 5
                    }).start();
                }

                if (!isDragging.current) {
                    setModalVisible(true);
                }

                try {
                    await AsyncStorage.setItem('chat_head_pos', JSON.stringify({ x: finalX, y: finalY }));
                } catch (e) {
                    console.log('Failed to save chat head pos');
                }
                isDragging.current = false;
            },
        })
    ).current;

    if (!isLoaded) return null;

    return (
        <>
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.chatHeadContainer,
                    {
                        transform: [{ translateX: pan.x }, { translateY: pan.y }]
                    }
                ]}
            >
                <View style={styles.avatarContainer}>
                    <Image
                        source={avatarSource}
                        style={styles.avatarImage}
                    />
                </View>
            </Animated.View>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalKeyboardContainer}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={styles.modalBackdrop}
                            activeOpacity={1}
                            onPress={() => setModalVisible(false)}
                        />
                        <View style={styles.protrudingChatContainer}>
                            <ChatInterface onClose={() => setModalVisible(false)} isModal={true} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    chatHeadContainer: {
        position: 'absolute',
        zIndex: 9999, // High z-index to sit on top
        top: 0,
        left: 0,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        borderWidth: 2,
        borderColor: '#1a73e8',
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    modalKeyboardContainer: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center', // Or flex-end if we want bottom-sheet style, but center is requested "fill screen more"
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingVertical: 50, // space from top/bottom
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    protrudingChatContainer: {
        width: width * 0.9,
        height: '85%', // Increased height
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: '#eee',
    }
});

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Easing, Image, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function RoomScreen() {
    const router = useRouter();
    const floatAnim = useRef(new Animated.Value(0)).current;

    // Position for "Me" avatar
    const mePos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    // Position for "Socius" avatar
    const sociusPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    const createPanResponder = (pos: Animated.ValueXY) =>
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: Animated.event(
                [null, { dx: pos.x, dy: pos.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pos.extractOffset();
            },
        });

    const mePanResponder = useRef(createPanResponder(mePos)).current;
    const sociusPanResponder = useRef(createPanResponder(sociusPos)).current;

    useEffect(() => {
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
        outputRange: [0, -20],
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>My Room</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.roomContent}>
                {/* Wall and Floor */}
                <View style={styles.wall} />
                <View style={styles.floor} />

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

                {/* Floating Avatar - Me */}
                <Animated.View
                    {...mePanResponder.panHandlers}
                    style={[
                        styles.avatarContainer,
                        {
                            transform: [
                                { translateX: mePos.x },
                                { translateY: Animated.add(mePos.y, translateY) }
                            ]
                        }
                    ]}
                >
                    <View style={styles.avatarHead}>
                        <View style={styles.eye} />
                        <View style={[styles.eye, { right: 10 }]} />
                        <View style={styles.smile} />
                    </View>
                    <View style={styles.avatarBody} />
                    <View style={styles.labelContainer}>
                        <Text style={styles.avatarLabel}>Me</Text>
                    </View>
                </Animated.View>

                {/* Floating Avatar - Socius */}
                <Animated.View
                    {...sociusPanResponder.panHandlers}
                    style={[
                        styles.avatarContainer,
                        {
                            left: '60%',
                            transform: [
                                { translateX: sociusPos.x },
                                { translateY: Animated.add(sociusPos.y, translateY) }
                            ]
                        }
                    ]}
                >
                    <Image
                        source={require('../assets/images/socius-avatar-0.png')}
                    style={styles.sociusAvatarImage}
                    />
                    <View style={styles.labelContainer}>
                        <Text style={styles.avatarLabel}>Socius</Text>
                    </View>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#fff',
        zIndex: 10,
    },
    backButton: {
        padding: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
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
        height: '60%',
        backgroundColor: '#e3f2fd',
    },
    floor: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        backgroundColor: '#f5f5f5',
        borderTopWidth: 2,
        borderTopColor: '#bdbdbd',
    },
    deskArea: {
        position: 'absolute',
        left: 20,
        bottom: '25%',
        width: 140,
        height: 80,
    },
    deskTop: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: 10,
        backgroundColor: '#8d6e63',
        borderRadius: 2,
    },
    deskLeg: {
        position: 'absolute',
        top: 10,
        width: 5,
        height: 60,
        backgroundColor: '#5d4037',
    },
    computer: {
        position: 'absolute',
        top: -30,
        left: 40,
        alignItems: 'center',
    },
    screen: {
        width: 40,
        height: 30,
        backgroundColor: '#333',
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#000',
    },
    bedArea: {
        position: 'absolute',
        right: 20,
        bottom: '15%',
        width: 160,
        height: 120,
    },
    bedFrame: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 20,
        backgroundColor: '#3e2723',
        borderRadius: 4,
    },
    mattress: {
        position: 'absolute',
        bottom: 10,
        width: '100%',
        height: 40,
        backgroundColor: '#fff',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#eee',
    },
    pillow: {
        position: 'absolute',
        top: 70, // Relative to area top
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
    avatarContainer: {
        position: 'absolute',
        top: '30%',
        left: '40%',
        alignItems: 'center',
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
});

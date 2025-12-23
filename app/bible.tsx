import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

// Importing JSON data
import niv from '../constants/bible/niv.json';
import saebunyeok from '../constants/bible/saebunyeok.json';
import gaeyeok from '../constants/bible/gaeyeok.json';

type Book = {
    name: string;
    chapters: string[][];
};

type BibleData = {
    name: string;
    books: Book[];
};

const BIBLE_VERSIONS: Record<string, BibleData> = {
    'NIV': niv as unknown as BibleData,
    '새번역': saebunyeok as unknown as BibleData,
    '개역개정': gaeyeok as unknown as BibleData,
};

const VERSIONS = [
    { id: 'NIV', name: 'English NIV' },
    { id: '새번역', name: '새번역' },
    { id: '개역개정', name: '개역개정' },
];

export default function BibleScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    // State
    const [selectedVersion, setSelectedVersion] = useState('개역개정');
    const [selectedBookIndex, setSelectedBookIndex] = useState<number>(0);
    const [selectedChapterIndex, setSelectedChapterIndex] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    // UI State
    const [isVersionPickerVisible, setIsVersionPickerVisible] = useState(false);
    const [isNavVisible, setIsNavVisible] = useState(false);
    const [navMode, setNavMode] = useState<'book' | 'chapter'>('book');

    const currentBible = BIBLE_VERSIONS[selectedVersion];

    // Persistence Logic
    useEffect(() => {
        loadProgress();
    }, []);

    useEffect(() => {
        if (!isLoading) {
            saveProgress();
        }
    }, [selectedVersion, selectedBookIndex, selectedChapterIndex]);

    const loadProgress = async () => {
        try {
            setIsLoading(true);
            const savedVersion = await AsyncStorage.getItem('bible_version');
            const savedBook = await AsyncStorage.getItem('bible_book');
            const savedChapter = await AsyncStorage.getItem('bible_chapter');

            if (savedVersion) setSelectedVersion(savedVersion);
            // Default to 0 if not found, rather than null, to match user's preferred strict layout
            if (savedBook) setSelectedBookIndex(parseInt(savedBook));
            if (savedChapter) setSelectedChapterIndex(parseInt(savedChapter));
        } catch (error) {
            console.error('Failed to load bible progress', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveProgress = async () => {
        try {
            await AsyncStorage.setItem('bible_version', selectedVersion);
            await AsyncStorage.setItem('bible_book', selectedBookIndex.toString());
            await AsyncStorage.setItem('bible_chapter', selectedChapterIndex.toString());
        } catch (error) {
            console.error('Failed to save bible progress', error);
        }
    };

    // Derived State
    const validBookIndex = selectedBookIndex < (currentBible?.books?.length || 0) ? selectedBookIndex : 0;
    const currentBook = currentBible?.books?.[validBookIndex];
    const validChapterIndex = currentBook && selectedChapterIndex < (currentBook.chapters?.length || 0) ? selectedChapterIndex : 0;
    const currentChapter = currentBook?.chapters?.[validChapterIndex] || [];
    const hasValidData = currentBible && currentBook && Array.isArray(currentBook.chapters);


    // Auto-correct invalid state (e.g. after version change or bad load)
    useEffect(() => {
        if (selectedBookIndex !== validBookIndex) {
            setSelectedBookIndex(validBookIndex);
        }
        if (selectedChapterIndex !== validChapterIndex) {
            setSelectedChapterIndex(validChapterIndex);
        }
    }, [selectedBookIndex, validBookIndex, selectedChapterIndex, validChapterIndex]);

    const handleNextChapter = () => {
        if (!currentBook?.chapters || !currentBible?.books) return;

        // Use VALID indices for logic to prevent crash
        if (validChapterIndex < currentBook.chapters.length - 1) {
            setSelectedChapterIndex(validChapterIndex + 1);
        } else if (validBookIndex < currentBible.books.length - 1) {
            setSelectedBookIndex(validBookIndex + 1);
            setSelectedChapterIndex(0);
        }
    };

    const handlePrevChapter = () => {
        // Use VALID indices for logic
        if (validChapterIndex > 0) {
            setSelectedChapterIndex(validChapterIndex - 1);
        } else if (validBookIndex > 0) {
            const prevBookIndex = validBookIndex - 1;
            const prevBook = currentBible.books?.[prevBookIndex];
            if (prevBook?.chapters) {
                setSelectedBookIndex(prevBookIndex);
                setSelectedChapterIndex(prevBook.chapters.length - 1);
            }
        }
    };

    const renderNavModal = () => {
        if (!currentBible || !currentBible.books || !Array.isArray(currentBible.books)) {
            return null;
        }

        const bookForModal = currentBook;
        const chaptersData = bookForModal?.chapters;
        const hasValidChapters = chaptersData && Array.isArray(chaptersData) && chaptersData.length > 0;

        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={isNavVisible}
                onRequestClose={() => setIsNavVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <TouchableOpacity onPress={() => setNavMode('book')}>
                                <Text style={[styles.modalTab, { color: colors.textSecondary }, navMode === 'book' && { color: colors.primary, fontWeight: 'bold' }]}>Books</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setNavMode('chapter')}>
                                <Text style={[styles.modalTab, { color: colors.textSecondary }, navMode === 'chapter' && { color: colors.primary, fontWeight: 'bold' }]}>Chapters</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsNavVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {navMode === 'book' ? (
                            <FlatList
                                key="books-list"
                                data={currentBible.books}
                                keyExtractor={(item, index) => `book-${index}`}
                                renderItem={({ item, index }) => (
                                    <TouchableOpacity
                                        style={[styles.navItem, { borderBottomColor: colors.border }]}
                                        onPress={() => {
                                            setSelectedBookIndex(index);
                                            setSelectedChapterIndex(0);
                                            setNavMode('chapter'); // Auto switch to chapter
                                        }}
                                    >
                                        <Text style={[styles.navItemText, { color: colors.text }, selectedBookIndex === index && { color: colors.primary, fontWeight: 'bold' }]}>
                                            {item.name}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        ) : (
                            hasValidChapters ? (
                                <FlatList
                                    key="chapters-list"
                                    data={chaptersData}
                                    numColumns={5}
                                    keyExtractor={(item, index) => `chapter-${index}`}
                                    renderItem={({ item, index }) => (
                                        <TouchableOpacity
                                            style={[styles.chapterBox, { backgroundColor: colors.inputBackground }]}
                                            onPress={() => {
                                                setSelectedChapterIndex(index);
                                                setIsNavVisible(false);
                                            }}
                                        >
                                            <Text style={[styles.chapterBoxText, { color: colors.text }, selectedChapterIndex === index && { color: colors.primary, fontWeight: 'bold' }]}>
                                                {index + 1}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            ) : (
                                <View style={styles.emptyStateContainer}>
                                    <Ionicons name="book-outline" size={48} color={colors.disabled} />
                                    <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No chapters available</Text>
                                    <Text style={[styles.emptyStateSubtext, { color: colors.disabled }]}>Please select a book first</Text>
                                </View>
                            )
                        )}
                    </View>
                </View>
            </Modal>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.navSelector, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    onPress={() => { setNavMode('book'); setIsNavVisible(true); }}
                >
                    <Text style={[styles.navText, { color: colors.text }]}>{currentBook?.name || 'Select Book'} {(validChapterIndex || 0) + 1} <Ionicons name="chevron-down" size={14} /></Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.versionSelector} onPress={() => setIsVersionPickerVisible(!isVersionPickerVisible)}>
                    <Text style={[styles.versionText, { color: colors.primary }]}>{selectedVersion} <Ionicons name="options" size={14} /></Text>
                </TouchableOpacity>
            </View>

            {isVersionPickerVisible && (
                <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    {VERSIONS.map((v) => (
                        <TouchableOpacity
                            key={v.id}
                            style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                            onPress={() => {
                                setSelectedVersion(v.id);
                                setIsVersionPickerVisible(false);
                            }}
                        >
                            <Text style={[styles.pickerItemText, { color: colors.text }, selectedVersion === v.id && { color: colors.primary, fontWeight: 'bold' }]}>
                                {v.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {hasValidData ? (
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={[styles.chapterTitle, { color: colors.text }]}>{currentBook?.name} {(validChapterIndex || 0) + 1}</Text>
                    {currentChapter.map((verse, idx) => (
                        <View key={idx} style={styles.verseContainer}>
                            <Text style={[styles.verseNumber, { color: colors.textSecondary }]}>{idx + 1}</Text>
                            <Text style={[styles.bibleText, { color: colors.text }]}>{verse || ''}</Text>
                        </View>
                    ))}
                    <View style={{ height: 100 }} />
                </ScrollView>
            ) : (
                <View style={styles.content}>
                    <Text style={{ textAlign: 'center', marginTop: 50, color: colors.textSecondary }}>Loading Bible...</Text>
                </View>
            )}

            {/* Floating Navigation Controls (Retained Feature) */}
            {hasValidData && (
                <View style={styles.floatingNavContainer}>
                    <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={styles.blurContainer}>
                        <TouchableOpacity onPress={handlePrevChapter} style={styles.navButton}>
                            <Ionicons name="chevron-back" size={24} color={colors.text} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setIsNavVisible(true)}>
                            <Text style={[styles.chapterIndicator, { color: colors.text }]}>Ch {selectedChapterIndex + 1}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleNextChapter} style={styles.navButton}>
                            <Ionicons name="chevron-forward" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </BlurView>
                </View>
            )}

            {renderNavModal()}
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
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 5,
    },
    navSelector: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 15,
        borderWidth: 1,
    },
    navText: {
        fontWeight: '600',
    },
    versionSelector: {
        padding: 5,
    },
    versionText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    pickerContainer: {
        borderBottomWidth: 1,
        elevation: 3,
        zIndex: 10,
    },
    pickerItem: {
        padding: 15,
        borderBottomWidth: 1,
    },
    pickerItemText: {
        fontSize: 16,
    },
    content: {
        padding: 20,
    },
    chapterTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    verseContainer: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    verseNumber: {
        fontSize: 12,
        width: 25,
        paddingTop: 4,
        fontWeight: 'bold',
    },
    bibleText: {
        flex: 1,
        fontSize: 18,
        lineHeight: 28,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '70%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        paddingBottom: 10,
    },
    modalTab: {
        fontSize: 18,
        marginRight: 20,
    },
    closeBtn: {
        marginLeft: 'auto',
    },
    navItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    navItemText: {
        fontSize: 16,
    },
    chapterBox: {
        width: '18%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        margin: '1%',
        borderRadius: 8,
    },
    chapterBoxText: {
        fontSize: 16,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontSize: 16,
        marginTop: 12,
        fontWeight: '500',
    },
    emptyStateSubtext: {
        fontSize: 14,
        marginTop: 4,
    },
    floatingNavContainer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    blurContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        overflow: 'hidden',
        minWidth: 200,
        justifyContent: 'space-between',
    },
    navButton: {
        padding: 10,
    },
    chapterIndicator: {
        fontSize: 16,
        fontWeight: '600',
        marginHorizontal: 10,
    },
});

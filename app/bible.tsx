import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Importing JSON data
import niv from '../constants/bible/niv.json';
import saebunyeok from '../constants/bible/saebunyeok.json';
import gaeyeok from '../constants/bible/gaeyeok.json';

type BibleData = {
    name: string;
    books: {
        name: string;
        chapters: string[][];
    }[];
};

const BIBLE_VERSIONS: Record<string, BibleData> = {
    'NIV': niv as BibleData,
    '새번역': saebunyeok as BibleData,
    '개역개정': gaeyeok as BibleData,
};

const VERSIONS = [
    { id: 'NIV', name: 'English NIV' },
    { id: '새번역', name: '새번역' },
    { id: '개역개정', name: '개역개정' },
];

export default function BibleScreen() {
    const router = useRouter();
    const [selectedVersion, setSelectedVersion] = useState('개역개정');
    const [selectedBookIndex, setSelectedBookIndex] = useState(0);
    const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);

    const [isVersionPickerVisible, setIsVersionPickerVisible] = useState(false);
    const [isNavVisible, setIsNavVisible] = useState(false);
    const [navMode, setNavMode] = useState<'book' | 'chapter'>('book');

    // Reset indices when version changes
    useEffect(() => {
        setSelectedBookIndex(0);
        setSelectedChapterIndex(0);
    }, [selectedVersion]);

    const currentBible = BIBLE_VERSIONS[selectedVersion];

    // Ensure indices are valid before accessing
    const validBookIndex = selectedBookIndex < (currentBible?.books?.length || 0) ? selectedBookIndex : 0;
    const currentBook = currentBible?.books?.[validBookIndex];

    const validChapterIndex = currentBook && selectedChapterIndex < (currentBook.chapters?.length || 0) ? selectedChapterIndex : 0;
    const currentChapter = currentBook?.chapters?.[validChapterIndex] || [];

    // Safety check - if no valid data, don't render
    const hasValidData = currentBible && currentBook && Array.isArray(currentBook.chapters);

    const handleNextChapter = () => {
        if (!currentBook?.chapters || !currentBible?.books) return;

        if (selectedChapterIndex < currentBook.chapters.length - 1) {
            setSelectedChapterIndex(selectedChapterIndex + 1);
        } else if (selectedBookIndex < currentBible.books.length - 1) {
            setSelectedBookIndex(selectedBookIndex + 1);
            setSelectedChapterIndex(0);
        }
    };

    const handlePrevChapter = () => {
        if (selectedChapterIndex > 0) {
            setSelectedChapterIndex(selectedChapterIndex - 1);
        } else if (selectedBookIndex > 0) {
            const prevBookIndex = selectedBookIndex - 1;
            const prevBook = currentBible.books?.[prevBookIndex];
            if (prevBook?.chapters) {
                setSelectedBookIndex(prevBookIndex);
                setSelectedChapterIndex(prevBook.chapters.length - 1);
            }
        }
    };

    const renderNavModal = () => {
        // Early validation to prevent crashes
        if (!currentBible || !currentBible.books || !Array.isArray(currentBible.books)) {
            return null;
        }

        // Capture currentBook to prevent race conditions during modal transitions
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
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setNavMode('book')}>
                                <Text style={[styles.modalTab, navMode === 'book' && styles.activeTab]}>Books</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setNavMode('chapter')}>
                                <Text style={[styles.modalTab, navMode === 'chapter' && styles.activeTab]}>Chapters</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsNavVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {navMode === 'book' ? (
                            <FlatList
                                key="books-list"
                                data={currentBible.books}
                                keyExtractor={(item, index) => `book-${index}`}
                                renderItem={({ item, index }) => (
                                    <TouchableOpacity
                                        style={styles.navItem}
                                        onPress={() => {
                                            setIsNavVisible(false);
                                            setTimeout(() => {
                                                setSelectedBookIndex(index);
                                                setSelectedChapterIndex(0);
                                            }, 100);
                                        }}
                                    >
                                        <Text style={[styles.navItemText, selectedBookIndex === index && styles.selectedNavItem]}>
                                            {item?.name || `Book ${index + 1}`}
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
                                            style={styles.chapterBox}
                                            onPress={() => {
                                                setIsNavVisible(false);
                                                setTimeout(() => {
                                                    setSelectedChapterIndex(index);
                                                }, 100);
                                            }}
                                        >
                                            <Text style={[styles.chapterBoxText, selectedChapterIndex === index && styles.selectedNavItem]}>
                                                {index + 1}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            ) : (
                                <View style={styles.emptyStateContainer}>
                                    <Ionicons name="book-outline" size={48} color="#ccc" />
                                    <Text style={styles.emptyStateText}>No chapters available</Text>
                                    <Text style={styles.emptyStateSubtext}>Please select a book first</Text>
                                </View>
                            )
                        )}
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navSelector} onPress={() => { setNavMode('book'); setIsNavVisible(true); }}>
                    <Text style={styles.navText}>{currentBook?.name || 'Loading...'} {selectedChapterIndex + 1} <Ionicons name="chevron-down" size={14} /></Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.versionSelector} onPress={() => setIsVersionPickerVisible(!isVersionPickerVisible)}>
                    <Text style={styles.versionText}>{selectedVersion} <Ionicons name="options" size={14} /></Text>
                </TouchableOpacity>
            </View>

            {isVersionPickerVisible && (
                <View style={styles.pickerContainer}>
                    {VERSIONS.map((v) => (
                        <TouchableOpacity
                            key={v.id}
                            style={styles.pickerItem}
                            onPress={() => {
                                setSelectedVersion(v.id);
                                setIsVersionPickerVisible(false);
                            }}
                        >
                            <Text style={[styles.pickerItemText, selectedVersion === v.id && styles.selectedPickerText]}>
                                {v.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {hasValidData ? (
                <ScrollView style={styles.content}>
                    <Text style={styles.chapterTitle}>{currentBook?.name} {(validChapterIndex || 0) + 1}</Text>
                    {currentChapter.map((verse, idx) => (
                        <View key={idx} style={styles.verseContainer}>
                            <Text style={styles.verseNumber}>{idx + 1}</Text>
                            <Text style={styles.bibleText}>{verse || '[Missing verse]'}</Text>
                        </View>
                    ))}

                    <View style={styles.bottomNav}>
                        <TouchableOpacity onPress={handlePrevChapter} style={styles.navBtn}>
                            <Ionicons name="arrow-back" size={20} color="#666" />
                            <Text style={styles.navBtnText}>Prev</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleNextChapter} style={styles.navBtn}>
                            <Text style={styles.navBtnText}>Next</Text>
                            <Ionicons name="arrow-forward" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            ) : (
                <View style={styles.content}>
                    <Text style={{ textAlign: 'center', marginTop: 50, color: '#999' }}>Loading Bible...</Text>
                </View>
            )}

            {renderNavModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 5,
    },
    navSelector: {
        backgroundColor: '#f8f9fa',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    navText: {
        fontWeight: '600',
        color: '#333',
    },
    versionSelector: {
        padding: 5,
    },
    versionText: {
        fontWeight: 'bold',
        color: '#1a73e8',
        fontSize: 12,
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    pickerItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9',
    },
    pickerItemText: {
        fontSize: 16,
        color: '#555',
    },
    selectedPickerText: {
        color: '#1a73e8',
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    chapterTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#222',
        textAlign: 'center',
    },
    verseContainer: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    verseNumber: {
        fontSize: 12,
        color: '#999',
        width: 25,
        paddingTop: 4,
        fontWeight: 'bold',
    },
    bibleText: {
        flex: 1,
        fontSize: 18,
        lineHeight: 28,
        color: '#333',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 20,
    },
    navBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    navBtnText: {
        marginHorizontal: 5,
        color: '#666',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '70%',
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    modalTab: {
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 20,
        color: '#999',
    },
    activeTab: {
        color: '#1a73e8',
    },
    closeBtn: {
        marginLeft: 'auto',
    },
    navItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f8f9fa',
    },
    navItemText: {
        fontSize: 16,
        color: '#333',
    },
    selectedNavItem: {
        color: '#1a73e8',
        fontWeight: 'bold',
    },
    chapterBox: {
        width: '18%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        margin: '1%',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    chapterBoxText: {
        fontSize: 16,
        color: '#333',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        color: '#999',
        fontSize: 16,
        marginTop: 12,
        fontWeight: '500',
    },
    emptyStateSubtext: {
        color: '#ccc',
        fontSize: 14,
        marginTop: 4,
    },
});

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { fixTimestamp } from '../utils/date';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';

type DiaryEntry = {
    id: string; // Changed to string based on renderEntry usage
    date: string;
    content: string;
    title?: string; // Added title
    created_at: string;
};

export default function DiaryScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [entries, setEntries] = useState<DiaryEntry[]>([]); // Kept as empty array, INITIAL_ENTRIES not provided
    const [newEntry, setNewEntry] = useState(''); // This state is no longer used for adding
    const [isAdding, setIsAdding] = useState(false); // This state is no longer used for adding
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null); // Changed to string
    const [editContent, setEditContent] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // New states for modal and new entry
    const [modalVisible, setModalVisible] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');

    const fetchEntries = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/diary');
            setEntries(res.data);
        } catch (error) {
            console.error('Failed to fetch diary entries:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    const handleSaveEntry = async () => { // Renamed from handleAddEntry
        if (newContent.trim() === '') return;

        try {
            const today = new Date().toISOString(); // Use full ISO string for date
            const res = await api.post('/diary', {
                content: newContent,
                title: newTitle.trim() === '' ? undefined : newTitle, // Optional title
                date: today
            });

            setEntries([res.data, ...entries]);
            setNewTitle('');
            setNewContent('');
            setModalVisible(false);
        } catch (error) {
            console.error('Failed to save diary entry:', error);
        }
    };

    const startEditing = (entry: DiaryEntry) => {
        setEditingId(entry.id);
        setEditContent(entry.content);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent('');
    };

    const saveEdit = async (id: string) => { // Changed id type to string
        if (editContent.trim() === '') return;
        setIsSavingEdit(true);
        try {
            const res = await api.put(`/diary/${id}`, { content: editContent });

            // Update local state
            setEntries(entries.map(e => e.id === id ? res.data : e));
            setEditingId(null);
            setEditContent('');
        } catch (error) {
            console.error('Failed to update diary entry:', error);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const renderEntry = ({ item }: { item: DiaryEntry }) => {
        const isEditing = editingId === item.id;

        return (
            <View style={[styles.entryCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.dateBadge, { backgroundColor: colors.inputBackground }]}>
                        <Text style={[styles.dateDay, { color: colors.primary }]}>{format(fixTimestamp(item.date), 'dd')}</Text>
                        <Text style={[styles.dateMonth, { color: colors.textSecondary }]}>{format(fixTimestamp(item.date), 'MMM')}</Text>
                    </View>
                    {!isEditing && (
                        <TouchableOpacity onPress={() => startEditing(item)} style={styles.editIcon}>
                            <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {isEditing ? (
                    <View>
                        <TextInput
                            style={[styles.editInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                            multiline
                            value={editContent}
                            onChangeText={setEditContent}
                            autoFocus
                        />
                        <View style={styles.editActions}>
                            <TouchableOpacity
                                style={[styles.editBtn, styles.cancelEditBtn, { backgroundColor: colors.inputBackground }]}
                                onPress={cancelEditing}
                                disabled={isSavingEdit}
                            >
                                <Text style={[styles.editBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.editBtn, styles.saveEditBtn, { backgroundColor: colors.primary }]}
                                onPress={() => saveEdit(item.id)}
                                disabled={isSavingEdit}
                            >
                                {isSavingEdit ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.editBtnText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.entryContentTextContainer}>
                        {item.title && <Text style={[styles.entryTitle, { color: colors.text }]}>{item.title}</Text>}
                        <Text style={[styles.entryPreview, { color: colors.textSecondary }]} numberOfLines={item.title ? 2 : 4}>
                            {item.content}
                        </Text>
                        <Text style={[styles.entryTime, { color: colors.textSecondary }]}>{format(fixTimestamp(item.date), 'h:mm a')}</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Diary</Text>
                <View style={{ width: 40 }} />
            </View>

            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <View style={styles.content}>
                    <FlatList
                        data={entries}
                        keyExtractor={item => item.id.toString()}
                        renderItem={renderEntry}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="book-outline" size={60} color={colors.textSecondary} />
                                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No entries yet. Start writing!</Text>
                            </View>
                        }
                    />
                </View>
            )}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>New Entry</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={[styles.inputTitle, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                            placeholder="Title (optional)"
                            placeholderTextColor={colors.textSecondary}
                            value={newTitle}
                            onChangeText={setNewTitle}
                        />

                        <TextInput
                            style={[styles.inputContent, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                            placeholder="Dear Diary..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            textAlignVertical="top"
                            value={newContent}
                            onChangeText={setNewContent}
                        />

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: colors.primary }]}
                            onPress={handleSaveEntry}
                        >
                            <Text style={styles.saveButtonText}>Save Entry</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5', // Softer background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 5,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a1a',
        letterSpacing: 0.5,
    },
    listContent: {
        padding: 20,
        paddingBottom: 100, // Space for FAB
    },
    entryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    entryDate: {
        fontSize: 14,
        color: '#888',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    editIcon: {
        padding: 5,
    },
    entryContent: {
        fontSize: 17,
        color: '#333',
        lineHeight: 26,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    inputContainer: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 10,
        zIndex: 10,
    },
    input: {
        fontSize: 18,
        color: '#333',
        minHeight: 120,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    addActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    addBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
    },
    saveAddBtn: {
        backgroundColor: '#1a73e8',
    },
    cancelAddBtn: {
        backgroundColor: '#f5f5f5',
    },
    addBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    editInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        color: '#333',
        minHeight: 100,
        marginBottom: 15,
        backgroundColor: '#fafafa',
        textAlignVertical: 'top',
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    editBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveEditBtn: {
        backgroundColor: '#1a73e8',
    },
    cancelEditBtn: {
        backgroundColor: '#f5f5f5',
    },
    editBtnText: {
        fontWeight: '600',
        fontSize: 14,
        color: '#fff',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#999',
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1a73e8',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1a73e8',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    // Missing styles added below
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    dateBadge: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderRadius: 12,
        minWidth: 50,
        marginRight: 15,
    },
    dateDay: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    dateMonth: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    entryContentTextContainer: {
        flex: 1,
    },
    entryTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 5,
    },
    entryPreview: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 8,
    },
    entryTime: {
        fontSize: 12,
        marginTop: 5,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        opacity: 0.7,
    },
    emptyStateText: {
        marginTop: 15,
        fontSize: 16,
        fontWeight: '500',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        minHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        paddingBottom: 15,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    inputTitle: {
        fontSize: 18,
        fontWeight: '600',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
    },
    inputContent: {
        fontSize: 16,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        minHeight: 200,
        marginBottom: 20,
    },
    saveButton: {
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

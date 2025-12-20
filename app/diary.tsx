import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type DiaryEntry = {
    id: string;
    date: string;
    content: string;
};

export default function DiaryScreen() {
    const router = useRouter();
    const [entries, setEntries] = useState<DiaryEntry[]>([
        { id: '1', date: '2025-12-19', content: 'Today was a great day. I started working on my AI project.' },
        { id: '2', date: '2025-12-18', content: 'Met with the team. We discussed the new room feature.' },
    ]);
    const [newEntry, setNewEntry] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddEntry = () => {
        if (newEntry.trim() === '') return;
        const entry: DiaryEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            content: newEntry,
        };
        setEntries([entry, ...entries]);
        setNewEntry('');
        setIsAdding(false);
    };

    const renderItem = ({ item }: { item: DiaryEntry }) => (
        <View style={styles.entryCard}>
            <Text style={styles.entryDate}>{item.date}</Text>
            <Text style={styles.entryContent}>{item.content}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>My Diary</Text>
                <TouchableOpacity onPress={() => setIsAdding(!isAdding)}>
                    <Ionicons name={isAdding ? "close" : "add"} size={30} color="#1a73e8" />
                </TouchableOpacity>
            </View>

            {isAdding && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.inputContainer}
                >
                    <TextInput
                        style={styles.input}
                        placeholder="What's on your mind?"
                        multiline
                        value={newEntry}
                        onChangeText={setNewEntry}
                        autoFocus
                    />
                    <TouchableOpacity style={styles.saveButton} onPress={handleAddEntry}>
                        <Text style={styles.saveButtonText}>Save Entry</Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            )}

            <FlatList
                data={entries}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>No entries yet. Start writing!</Text>}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    listContent: {
        padding: 20,
    },
    entryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    entryDate: {
        fontSize: 14,
        color: '#888',
        marginBottom: 5,
    },
    entryContent: {
        fontSize: 16,
        color: '#444',
        lineHeight: 22,
    },
    inputContainer: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    input: {
        fontSize: 16,
        color: '#333',
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 15,
    },
    saveButton: {
        backgroundColor: '#1a73e8',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#999',
        fontSize: 16,
    },
});

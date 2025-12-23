import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import api from '../services/api';
import { useSession } from './AuthContext';
import * as Notifications from 'expo-notifications';

interface NotificationContextType {
    unreadCount: number;
    lastNotificationTime: Date | null;
    refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
    unreadCount: 0,
    lastNotificationTime: null,
    refreshNotifications: async () => { },
});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { session } = useSession();
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastNotificationTime, setLastNotificationTime] = useState<Date | null>(null);

    const refreshNotifications = async () => {
        if (!session) return;
        try {
            // We need a backend endpoint for unread count, or we infer from recent messages
            // For now, let's assume we fetch recent conversations and count unread
            // Or add a specific endpoint. Let's try fetching recent and summing unread.
            // Since backend doesn't explicitly return unread count yet, we might need to update backend or estimate.
            // For this quick fix, let's assume valid response and just count "new" items if any (mock logic or partial implementation)

            // BETTER APPROACH: Add a lightweight endpoint or just poll recent messages and check if last message is from 'other' and not read?
            // Existing /messages/recent returns last_message but not read status.
            // Let's rely on a new endpoint or just placeholder for now until backend support is added?
            // Actually, let's just fetch queries to check connectivity, but for real count we need API support.

            // Checking socius_api.py, DirectMessage has 'read_at'.
            // We can add an endpoint /notifications/unread-count

            // For now, to avoid backend changes if possible, we can poll /messages/recent and see if we can deduce anything.
            // Actually, without read_at in response, we can't.

            // Let's implement a simple poller that sets a mock number or checks a new endpoint we "wish" existed.
            // Wait, I can Modify backend!

            // Let's add GET /notifications/unread-count to backend first? 
            // The user didn't ask for backend changes but "in app notification badge" implies full stack.
            // I'll stick to a simple poller that fetches /friends/requests as a proxy for "notifications" for now?
            // And maybe assume 0 for messages until visited.

            const res = await api.get('/notifications/unread');
            const total = res.data.total;
            setUnreadCount(total);
            await Notifications.setBadgeCountAsync(total);
        } catch (error) {
            console.log('Failed to fetch notifications');
        }
    };

    useEffect(() => {
        if (session) {
            refreshNotifications();

            const handleAppStateChange = (nextAppState: AppStateStatus) => {
                if (nextAppState === 'active') {
                    refreshNotifications();
                }
            };
            const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

            const subscription = Notifications.addNotificationReceivedListener(_notification => {
                refreshNotifications();
                setLastNotificationTime(new Date());
            });
            const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
                refreshNotifications();
            });

            return () => {
                appStateSubscription.remove();
                subscription.remove();
                backgroundSubscription.remove();
            };
        }
    }, [session]);

    return (
        <NotificationContext.Provider value={{ unreadCount, lastNotificationTime, refreshNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
}

export const AVATAR_MAP: Record<string, any> = {
    'socius-icon': require('../assets/images/socius-icon.png'),
    'socius-avatar-1': require('../assets/images/socius-avatar-1.jpg'),
    'socius-avatar-2': require('../assets/images/socius-avatar-2.jpg'),
    'socius-avatar-3': require('../assets/images/socius-avatar-3.jpg'),
};

export const USER_AVATAR_MAP: Record<string, any> = {
    'user-1': require('../assets/images/socius-avatar-1.jpg'),
    'user-2': require('../assets/images/socius-avatar-2.jpg'),
    'user-3': require('../assets/images/socius-avatar-3.jpg'),
    'user-4': require('../assets/images/socius-icon.png'),
};

export const USER_AVATARS = [
    { id: 'user-1', source: USER_AVATAR_MAP['user-1'] },
    { id: 'user-2', source: USER_AVATAR_MAP['user-2'] },
    { id: 'user-3', source: USER_AVATAR_MAP['user-3'] },
    { id: 'user-4', source: USER_AVATAR_MAP['user-4'] },
];

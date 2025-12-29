export const SOCIUS_AVATAR_MAP: Record<string, any> = {
    'socius-avatar-0': require('../assets/images/socius-avatar-0.png'),
    'socius-avatar-1': require('../assets/images/socius-avatar-1.png'),
    'socius-avatar-2': require('../assets/images/socius-avatar-2.png'),
    'socius-avatar-3': require('../assets/images/socius-avatar-3.png'),
};

export const PROFILE_AVATAR_MAP: Record<string, any> = {
    'user-1': require('../assets/images/profile-avatar-1.jpg'),
    'user-2': require('../assets/images/profile-avatar-2.jpg'),
    'user-3': require('../assets/images/profile-avatar-3.jpg'),
};

export const PROFILE_AVATARS = [
    { id: 'user-1', source: PROFILE_AVATAR_MAP['user-1'] },
    { id: 'user-2', source: PROFILE_AVATAR_MAP['user-2'] },
    { id: 'user-3', source: PROFILE_AVATAR_MAP['user-3'] },
];

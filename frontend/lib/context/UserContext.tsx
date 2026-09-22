'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { authClient } from '@/lib/auth/client';
import { getCurrentUser } from '@/lib/api/actions/client-actions';
import { User } from '../types';

type UserContextType = {
    user: User | null;
    loading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    return (
        <UserContext.Provider value={{ user, loading }}>
            {children}
        </UserContext.Provider>
    );
};

export const useCurrentUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useCurrentUser must be used within a UserProvider');
    }
    return context;
};
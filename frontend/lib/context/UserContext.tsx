'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser } from '@/lib/api/actions/client-actions';
import { User } from '../types';

type UserContextType = {
    user: User | null;
    loading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: currentUserData, error } = await getCurrentUser();
            if (error?.code === "REGISTRATION_INCOMPLETE" && pathname !== "/complete-registration") router.replace("/complete-registration");
            try {
                setUser(currentUserData ?? null);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [pathname, router]);

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
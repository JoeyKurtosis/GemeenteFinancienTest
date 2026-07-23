import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { login as loginRequest, logout as logoutRequest, me } from "../api";
import type { User } from "../api";

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (email: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadUser = async () => {
            try {
                const currentUser = await me();
                if (isMounted) setUser(currentUser);
            } catch {
                if (isMounted) setUser(null);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadUser();

        return () => {
            isMounted = false;
        };
    }, []);

    const login = async (email: string, password: string) => {
        const loggedInUser = await loginRequest(email, password);
        setUser(loggedInUser);
        return loggedInUser;
    };

    const logout = async () => {
        await logoutRequest();
        setUser(null);
    };

    const value = useMemo(
        () => ({
            user,
            isLoading,
            isAuthenticated: Boolean(user),
            isAdmin: Boolean(user?.is_admin),
            login,
            logout,
            setUser,
        }),
        [user, isLoading],
    );

    return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

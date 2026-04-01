'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const data = await api.getMe();
            setUser(data.user);
            if (typeof window !== 'undefined' && data?.user?.organization?.companyId) {
                localStorage.setItem('lastCompanyId', data.user.organization.companyId);
            }
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        const data = await api.login(credentials);
        setUser(data.user);
        if (typeof window !== 'undefined' && data?.user?.organization?.companyId) {
            localStorage.setItem('lastCompanyId', data.user.organization.companyId);
        }
        return data;
    };

    const register = async (userData) => {
        const data = await api.register(userData);
        setUser(data.user);
        if (typeof window !== 'undefined' && data?.user?.organization?.companyId) {
            localStorage.setItem('lastCompanyId', data.user.organization.companyId);
        }
        return data;
    };

    const logout = () => {
        api.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

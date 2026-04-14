'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import NavigationWrapper from '../navigation/NavigationWrapper';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children }) {
    const { user, loading } = useAuth();
    useEffect(() => {
        // any dashboard specific global effects if needed...
    }, []);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) {
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        return null;
    }

    return (
        <NavigationWrapper>
            {children}
        </NavigationWrapper>
    );
}

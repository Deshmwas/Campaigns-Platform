'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children }) {
    const { user, loading } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebarCollapsed') === 'true';
            setIsSidebarCollapsed(saved);

            const handleToggle = (e) => {
                setIsSidebarCollapsed(e.detail);
            };

            window.addEventListener('sidebar-toggle', handleToggle);
            return () => window.removeEventListener('sidebar-toggle', handleToggle);
        }
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
        <div className={styles.layout}>
            <Sidebar />
            <main className={`${styles.main} ${isSidebarCollapsed ? styles.mainCollapsed : ''}`}>
                {children}
            </main>
        </div>
    );
}

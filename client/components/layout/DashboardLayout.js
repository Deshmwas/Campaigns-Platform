'use client';

import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children }) {
    const { user, loading } = useAuth();

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
            <main className={styles.main}>{children}</main>
        </div>
    );
}

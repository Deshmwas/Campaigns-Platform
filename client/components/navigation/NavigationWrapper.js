'use client';

import React, { useState, useEffect } from 'react';
import { useLayoutConfig } from '../../context/LayoutContext';
import Sidebar from '../layout/Sidebar';
import TopNavigation from './TopNavigation';
import styles from '../layout/DashboardLayout.module.css';
import topNavStyles from './NavigationWrapper.module.css';

export default function NavigationWrapper({ children }) {
    const { layoutMode, isMounted } = useLayoutConfig();
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

    // Prevent hydration mismatch
    if (!isMounted) {
        return null;
    }

    if (layoutMode === 'topbar') {
        return (
            <div className={topNavStyles.topNavLayout}>
                <TopNavigation />
                <main className={topNavStyles.topNavMain}>
                    {children}
                </main>
            </div>
        );
    }

    // Default to Sidebar mode
    return (
        <div className={styles.layout}>
            <Sidebar />
            <main className={`${styles.main} ${isSidebarCollapsed ? styles.mainCollapsed : ''}`}>
                {children}
            </main>
        </div>
    );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';
import {
    MdDashboard,
    MdContacts,
    MdList,
    MdCampaign,
    MdEmail,
    MdSms,
    MdSettings,
    MdLogout,
    MdBarChart,
    MdMenu,
    MdChevronLeft,
    MdChevronRight,
    MdAlternateEmail
} from 'react-icons/md';
import api from '../../lib/api';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: MdDashboard },
    { href: '/contacts', label: 'Contacts', icon: MdContacts },
    { href: '/lists', label: 'Lists', icon: MdList },
    { href: '/campaigns', label: 'Campaigns', icon: MdCampaign },
    { href: '/templates/email', label: 'Email Templates', icon: MdEmail },
    { href: '/templates/sms', label: 'SMS Templates', icon: MdSms },
    { href: '/senders', label: 'Sender Emails', icon: MdAlternateEmail },
    { href: '/reports', label: 'Reports', icon: MdBarChart },
    { href: '/settings', label: 'Settings', icon: MdSettings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sidebarCollapsed') === 'true';
        }
        return false;
    });

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', newState.toString());
        // Trigger a custom event for DashboardLayout to respond
        window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: newState }));
    };
    
    const computeInitials = (name) => {
        if (!name) return 'C';
        return name.trim().split(/\s+/).slice(0, 3).map(w => w[0].toUpperCase()).join('');
    };
    
    const resolveLogo = (url) => {
        if (!url) return null;
        return url.startsWith('http') ? url : api.ensureAbsoluteUrl(url);
    };
    
    const orgName = user?.organization?.name || 'Campaigns';

    return (
        <>
            <button className={styles.mobileToggle} onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <MdClose /> : <MdMenu />}
            </button>
            <div className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`} onClick={() => setIsOpen(false)}></div>
            <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''} ${isCollapsed ? styles.collapsed : ''}`}>
                <div className={styles.brand}>
                    <div className={styles.logo}>
                        {user?.organization?.settings?.logoUrl ? (
                            <img 
                                src={resolveLogo(user.organization.settings.logoUrl)} 
                                alt="Logo" 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                            />
                        ) : (
                            computeInitials(orgName)
                        )}
                    </div>
                    {!isCollapsed && <h1 className={styles.title}>{orgName}</h1>}
                </div>

                <div className={styles.collapseToggle} onClick={toggleCollapse}>
                    {isCollapsed ? <MdChevronRight /> : <MdChevronLeft />}
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                onClick={() => setIsOpen(false)}
                                title={isCollapsed ? item.label : ''}
                            >
                                <Icon className={styles.icon} />
                                {!isCollapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.footer}>
                    <div className={styles.user}>
                        <div className={styles.userAvatar}>
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        {!isCollapsed && (
                            <div className={styles.userInfo}>
                                <div className={styles.userName}>
                                    {user?.firstName} {user?.lastName}
                                </div>
                                <div className={styles.userRole}>{user?.role}</div>
                            </div>
                        )}
                    </div>
                    <button onClick={logout} className={styles.logoutButton} title="Logout">
                        <MdLogout />
                    </button>
                </div>
            </aside>
        </>
    );
}

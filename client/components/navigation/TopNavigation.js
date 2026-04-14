'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useLayoutConfig } from '../../context/LayoutContext';
import { navItems } from '../../lib/navigation/navConfig';
import styles from './TopNavigation.module.css';
import { MdMenu, MdClose, MdDashboardCustomize } from 'react-icons/md';
import api from '../../lib/api';

export default function TopNavigation() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { toggleLayout } = useLayoutConfig();
    const [isNavOpen, setIsNavOpen] = useState(false);

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
        <header className={styles.topNav}>
            <div className={styles.brand}>
                <button className={styles.mobileToggle} onClick={() => setIsNavOpen(!isNavOpen)}>
                    {isNavOpen ? <MdClose /> : <MdMenu />}
                </button>
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
                <h1 className={styles.title}>{orgName}</h1>
            </div>

            <nav className={`${styles.nav} ${isNavOpen ? styles.navOpen : ''}`}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const hasChildren = item.children && item.children.length > 0;

                    return (
                        <div key={item.href} className={styles.navItemWrapper}>
                            <Link
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                onClick={() => setIsNavOpen(false)}
                            >
                                <Icon className={styles.icon} />
                                <span>{item.label}</span>
                            </Link>
                            
                            {hasChildren && (
                                <div className={styles.subMenuDropdown}>
                                    {item.children.map(child => (
                                        <Link 
                                            key={child.href} 
                                            href={child.href}
                                            className={`${styles.subNavItem} ${pathname === child.href ? styles.subMenuActive : ''}`}
                                            onClick={() => setIsNavOpen(false)}
                                        >
                                            {child.label}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className={styles.controls}>
                <button className={styles.toggleLayoutBtn} onClick={toggleLayout} title="Toggle Layout (Ctrl+B)">
                    <MdDashboardCustomize /> Layout
                </button>
                <div className={styles.user}>
                    <div className={styles.userAvatar} onClick={logout} title="Logout">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                </div>
            </div>
        </header>
    );
}

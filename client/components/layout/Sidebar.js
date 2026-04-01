'use client';

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
} from 'react-icons/md';
import api from '../../lib/api';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: MdDashboard },
    { href: '/contacts', label: 'Contacts', icon: MdContacts },
    { href: '/lists', label: 'Lists', icon: MdList },
    { href: '/campaigns', label: 'Campaigns', icon: MdCampaign },
    { href: '/templates/email', label: 'Email Templates', icon: MdEmail },
    { href: '/templates/sms', label: 'SMS Templates', icon: MdSms },
    { href: '/senders', label: 'Sender Emails', icon: MdSettings },
    { href: '/reports', label: 'Reports', icon: MdBarChart },
    { href: '/settings', label: 'Settings', icon: MdSettings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
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
        <aside className={styles.sidebar}>
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
                <h1 className={styles.title}>{orgName}</h1>
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
                        >
                            <Icon className={styles.icon} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <div className={styles.user}>
                    <div className={styles.userAvatar}>
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>
                            {user?.firstName} {user?.lastName}
                        </div>
                        <div className={styles.userRole}>{user?.role}</div>
                    </div>
                </div>
                <button onClick={logout} className={styles.logoutButton}>
                    <MdLogout />
                </button>
            </div>
        </aside>
    );
}

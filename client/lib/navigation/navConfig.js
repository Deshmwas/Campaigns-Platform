import {
    MdDashboard,
    MdContacts,
    MdList,
    MdCampaign,
    MdEmail,
    MdSms,
    MdSettings,
    MdBarChart,
    MdAlternateEmail
} from 'react-icons/md';

export const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: MdDashboard },
    { href: '/contacts', label: 'Contacts', icon: MdContacts },
    { href: '/lists', label: 'Lists', icon: MdList },
    { href: '/campaigns', label: 'Campaigns', icon: MdCampaign },
    { href: '/templates/email', label: 'Email Templates', icon: MdEmail },
    { href: '/templates/sms', label: 'SMS Templates', icon: MdSms },
    { href: '/senders', label: 'Sender Emails', icon: MdAlternateEmail },
    { 
        href: '/reports', 
        label: 'Reports', 
        icon: MdBarChart,
        children: [
            { href: '/reports/sent', label: 'Sent Campaigns' },
            { href: '/reports/sent', label: 'Campaign-based Reports' },
            { href: '/reports/lists', label: 'List-based Reports' },
            { href: '/reports/sms', label: 'SMS campaign-based reports' }
        ]
    },
    { href: '/settings', label: 'Settings', icon: MdSettings },
];

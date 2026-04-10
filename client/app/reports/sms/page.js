'use client';

import DashboardLayout from '../../../components/layout/DashboardLayout';
import styles from '../sent/sent.module.css';

export default function SmsReportsPage() {
    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.breadcrumbs}>Reports &gt; SMS Reports</div>
                <div className={styles.header}>
                    <h1 className={styles.title}>SMS Campaign Reports</h1>
                </div>
                <div style={{ padding: '5rem', textAlign: 'center', color: '#6b7280' }}>
                    <h2>SMS Reporting Coming Soon</h2>
                    <p>We are currently finalizing the analytical engine for SMS campaigns. Stay tuned!</p>
                </div>
            </div>
        </DashboardLayout>
    );
}

'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import styles from './dashboard.module.css';
import { MdContacts, MdCampaign, MdTrendingUp, MdMouse, MdEmail, MdSms, MdError, MdPeople } from 'react-icons/md';

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const result = await api.getDashboard();
            setData(result);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className={styles.loading}>Loading dashboard...</div>
            </DashboardLayout>
        );
    }

    const overview = data?.overview || {};
    const stats = data?.aggregateStats || {};

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.greetingHeader}>
                    <h1 className={styles.greeting}>Welcome, {user?.firstName || user?.organization?.name || 'User'}!</h1>
                    <div className={styles.headerActions}>
                        <Button variant="primary" onClick={() => window.location.href = '/campaigns/new'}>
                            + Create Campaign
                        </Button>
                    </div>
                </div>

                {/* Top Stats Row */}
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}><MdCampaign /></div>
                        <div><div className={styles.statValue}>{overview.totalCampaigns || 0}</div><div className={styles.statLabel}>Total Campaigns</div></div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}><MdEmail /></div>
                        <div><div className={styles.statValue}>{stats.totalSent || 0}</div><div className={styles.statLabel}>Total Sent</div></div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}><MdPeople /></div>
                        <div><div className={styles.statValue}>{overview.totalRecipients || 0}</div><div className={styles.statLabel}>Total Recipients</div></div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}><MdError /></div>
                        <div><div className={styles.statValue}>{stats.totalFailed || 0}</div><div className={styles.statLabel}>Failed</div></div>
                    </div>
                </div>

                {/* Secondary Stats Row */}
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}><MdContacts /></div>
                        <div><div className={styles.statValue}>{overview.totalContacts || 0}</div><div className={styles.statLabel}>Total Contacts</div></div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}><MdTrendingUp /></div>
                        <div><div className={styles.statValue}>{overview.openRate || '0%'}</div><div className={styles.statLabel}>Open Rate</div></div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}><MdMouse /></div>
                        <div><div className={styles.statValue}>{overview.clickRate || '0%'}</div><div className={styles.statLabel}>Click Rate</div></div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}><MdSms /></div>
                        <div><div className={styles.statValue}>{overview.smsCampaignCount || 0}</div><div className={styles.statLabel}>SMS Campaigns</div></div>
                    </div>
                </div>

                <div className={styles.mainGrid}>
                    {/* Recent Campaigns */}
                    <Card className={styles.recentCard}>
                        <div className={styles.cardHeader}>
                            <h2>Recent Campaigns</h2>
                            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/campaigns'}>View All</Button>
                        </div>

                        {data?.recentCampaigns?.length > 0 ? (
                            <div className={styles.campaignList}>
                                {data.recentCampaigns.map(c => (
                                    <div key={c.id} className={styles.campaignRow}
                                        onClick={() => window.location.href = `/campaigns/${c.id}`}
                                        style={{ cursor: 'pointer' }}>
                                        <div>
                                            <div className={styles.campaignName}>{c.name}</div>
                                            <div className={styles.campaignMeta}>{c.type} · {new Date(c.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        <span className={`${styles.statusBadge} ${styles[`status${c.status}`]}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>No campaigns yet. Create one to get started!</div>
                        )}
                    </Card>

                    {/* Campaign Stats Summary */}
                    <Card className={styles.statsSummaryCard}>
                        <div className={styles.cardHeader}>
                            <h2>Campaign Overview</h2>
                        </div>
                        <div className={styles.simpleStatsGrid}>
                            <div className={styles.simpleStat}>
                                <span className={styles.bigNumberBlue}>{overview.sentCount || 0}</span>
                                <span className={styles.statLabel}>Sent</span>
                            </div>
                            <div className={styles.simpleStat}>
                                <span className={styles.bigNumber}>{overview.scheduledCount || 0}</span>
                                <span className={styles.statLabel}>Scheduled</span>
                            </div>
                            <div className={styles.simpleStat}>
                                <span className={styles.bigNumber}>{overview.draftCount || 0}</span>
                                <span className={styles.statLabel}>Drafts</span>
                            </div>
                            <div className={styles.simpleStat}>
                                <span className={styles.bigNumber}>{overview.failedCount || 0}</span>
                                <span className={styles.statLabel}>Failed</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}

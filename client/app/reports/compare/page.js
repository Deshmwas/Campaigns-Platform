'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Button from '../../../components/Button';
import api from '../../../lib/api';
import styles from './compare.module.css';

export const dynamic = 'force-dynamic';

function CompareCampaignsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const idsParam = searchParams.get('ids');
        if (idsParam) {
            const ids = idsParam.split(',');
            if (ids.length === 2) {
                loadCompareData(ids[0], ids[1]);
            } else {
                setError("Please select exactly 2 campaigns to compare.");
                setLoading(false);
            }
        } else {
            setError("No campaigns selected for comparison.");
            setLoading(false);
        }
    }, [searchParams]);

    const loadCompareData = async (id1, id2) => {
        try {
            const [res1, res2] = await Promise.all([
                fetch(`${api.baseUrl}/api/reports/campaign/${id1}`, { headers: { 'Authorization': `Bearer ${api.getToken()}` } }),
                fetch(`${api.baseUrl}/api/reports/campaign/${id2}`, { headers: { 'Authorization': `Bearer ${api.getToken()}` } })
            ]);

            if (!res1.ok || !res2.ok) throw new Error("Failed to load one or both campaigns");

            const data1 = await res1.json();
            const data2 = await res2.json();

            setCampaigns([data1, data2]);
        } catch (err) {
            console.error(err);
            setError("Failed to fetch comparison data.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <DashboardLayout><div className={styles.loading}>Loading comparison...</div></DashboardLayout>;
    if (error) return <DashboardLayout><div className={styles.error}>{error}<br/><br/><Button onClick={() => router.back()}>Go Back</Button></div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.breadcrumbs}>
                    <span onClick={() => router.push('/reports/sent')} style={{cursor: 'pointer'}}>Reports &gt; Sent Campaigns</span> &gt; Compare
                </div>
                
                <div className={styles.header}>
                    <h1 className={styles.title}>Campaign Comparison</h1>
                    <Button variant="outline" onClick={() => router.back()}>Back to List</Button>
                </div>

                <div className={styles.compareGrid}>
                    {campaigns.map((data, index) => {
                        const { campaign, metrics } = data;
                        
                        // Calculate Rates
                        const sent = metrics.sent || 0;
                        const deliveredRate = sent > 0 ? ((metrics.delivered || 0) / sent) * 100 : 0;
                        const openRate = metrics.delivered > 0 ? ((metrics.opened || 0) / metrics.delivered) * 100 : 0;
                        const clickRate = metrics.opened > 0 ? ((metrics.clicked || 0) / metrics.opened) * 100 : 0;
                        const bounceRate = sent > 0 ? (((sent - (metrics.delivered || 0)) / sent) * 100) : 0;

                        return (
                            <div key={campaign.id || index} className={styles.campaignCard}>
                                <div className={styles.campaignHeader}>
                                    <h2 className={styles.campaignName}>{campaign.name}</h2>
                                    <p className={styles.campaignDate}>
                                        Sent: {new Date(campaign.sentAt || new Date()).toLocaleString()}
                                    </p>
                                </div>
                                <div className={styles.statsGrid}>
                                    <div className={styles.statBox}>
                                        <div className={styles.statValue}>{sent.toLocaleString()}</div>
                                        <div className={styles.statLabel}>Total Sent</div>
                                    </div>
                                    <div className={styles.statBox}>
                                        <div className={`${styles.statValue} ${styles.success}`}>{deliveredRate.toFixed(1)}%</div>
                                        <div className={styles.statLabel}>Delivery Rate</div>
                                    </div>
                                    <div className={styles.statBox}>
                                        <div className={`${styles.statValue} ${styles.success}`}>{openRate.toFixed(1)}%</div>
                                        <div className={styles.statLabel}>Open Rate</div>
                                    </div>
                                    <div className={styles.statBox}>
                                        <div className={`${styles.statValue} ${styles.success}`}>{clickRate.toFixed(1)}%</div>
                                        <div className={styles.statLabel}>Click Rate</div>
                                    </div>
                                    <div className={styles.statBox}>
                                        <div className={`${styles.statValue} ${styles.warning}`}>{bounceRate.toFixed(1)}%</div>
                                        <div className={styles.statLabel}>Bounce Rate</div>
                                    </div>
                                    <div className={styles.statBox}>
                                        <div className={`${styles.statValue} ${styles.danger}`}>{metrics.unsubscribed || 0}</div>
                                        <div className={styles.statLabel}>Unsubscribes</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
}

import { Suspense } from 'react';

export default function CompareCampaignsPage() {
    return (
        <Suspense fallback={<DashboardLayout><div className={styles.loading}>Loading comparison...</div></DashboardLayout>}>
            <CompareCampaignsContent />
        </Suspense>
    );
}

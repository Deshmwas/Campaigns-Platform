'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import api from '../../lib/api';
import styles from './reports.module.css';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { MdDownload } from 'react-icons/md';

const PIE_COLORS = ['#3b82f6', '#16a34a'];

export default function ReportsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
        const interval = setInterval(loadAnalytics, 15000);
        return () => clearInterval(interval);
    }, []);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const result = await api.getCampaignAnalytics();
            setData(result);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data?.performance?.length) return;
        const headers = ['Campaign', 'Sent', 'Delivered', 'Opened', 'Clicked', 'Failed'];
        const rows = data.performance.map(row => [row.name, row.sent, row.delivered || 0, row.opened, row.clicked, row.failed || 0]);
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'campaign_report.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totals = data?.totals || {};
    const hasData = data && (totals.totalSent > 0 || data.performance?.length > 0);

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Analytics & Reports</h1>
                        <p className={styles.subtitle}>Real-time campaign performance data</p>
                    </div>
                    <div className={styles.actions}>
                        <Button variant="outline" onClick={handleExport} disabled={!hasData}>
                            <MdDownload /> Export CSV
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className={styles.loading}>Loading analytics...</div>
                ) : !hasData ? (
                    <Card>
                        <div style={{textAlign:'center',padding:'4rem 2rem',color:'var(--color-gray-500)'}}>
                            <h3>No campaign data yet</h3>
                            <p>Send your first campaign to see analytics here</p>
                        </div>
                    </Card>
                ) : (
                    <div className={styles.grid}>
                        {/* Metric Cards */}
                        <div className={styles.metricsGrid}>
                            <div className={styles.metricCard}>
                                <h3>Total Campaigns</h3>
                                <div className={styles.metricValue}>{totals.totalCampaigns || 0}</div>
                            </div>
                            <div className={styles.metricCard}>
                                <h3>Total Sent</h3>
                                <div className={styles.metricValue}>{totals.totalSent?.toLocaleString() || 0}</div>
                            </div>
                            <div className={styles.metricCard}>
                                <h3>Total Recipients</h3>
                                <div className={styles.metricValue}>{totals.totalRecipients?.toLocaleString() || 0}</div>
                            </div>
                            <div className={styles.metricCard}>
                                <h3>Delivered</h3>
                                <div className={`${styles.metricValue} ${styles.success}`}>{totals.totalDelivered?.toLocaleString() || 0}</div>
                            </div>
                            <div className={styles.metricCard}>
                                <h3>Open Rate</h3>
                                <div className={`${styles.metricValue} ${styles.success}`}>{data.openRate}%</div>
                            </div>
                            <div className={styles.metricCard}>
                                <h3>Click Rate</h3>
                                <div className={`${styles.metricValue} ${styles.warning}`}>{data.clickRate}%</div>
                            </div>
                            <div className={styles.metricCard}>
                                <h3>Failed</h3>
                                <div className={`${styles.metricValue} ${styles.danger}`}>{totals.totalFailed?.toLocaleString() || 0}</div>
                            </div>
                            <div className={styles.metricCard}>
                                <h3>Unsubscribes</h3>
                                <div className={`${styles.metricValue} ${styles.danger}`}>{totals.totalUnsubscribed?.toLocaleString() || 0}</div>
                            </div>
                        </div>

                        {/* Sent Campaigns Breakdown */}
                        <div className={styles.metricsGrid} style={{ marginTop: 0 }}>
                            <div className={styles.metricCard}>
                                <h3>Sent Campaigns</h3>
                                <div className={styles.metricValue}>{totals.sentCampaigns || 0}</div>
                            </div>
                            <div className={styles.metricCard}>
                                <h3>Failed Campaigns</h3>
                                <div className={`${styles.metricValue} ${styles.danger}`}>{totals.failedCampaigns || 0}</div>
                            </div>
                            <div className={styles.metricCard}>
                                <h3>Emails Sent</h3>
                                <div className={styles.metricValue}>{totals.emailSent?.toLocaleString() || 0}</div>
                            </div>
                            <div className={styles.metricCard}>
                                <h3>SMS Sent</h3>
                                <div className={styles.metricValue}>{totals.smsSent?.toLocaleString() || 0}</div>
                            </div>
                        </div>

                        {/* Performance Chart */}
                        {data.performance?.length > 0 && (
                            <Card title="Campaign Performance" className={styles.fullWidth}>
                                <div className={styles.chartContainer}>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <AreaChart data={data.performance}>
                                            <defs>
                                                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                            <Area type="monotone" dataKey="sent" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSent)" name="Sent" />
                                            <Area type="monotone" dataKey="opened" stroke="#16a34a" fillOpacity={1} fill="url(#colorOpened)" name="Opened" />
                                            <Legend />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        )}

                        {/* Engagement Bar Chart */}
                        {data.performance?.length > 0 && (
                            <Card title="Engagement & Delivery">
                                <div className={styles.chartContainer}>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={data.performance}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="sent" name="Sent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="delivered" name="Delivered" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="opened" name="Opened" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="clicked" name="Clicked" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="failed" name="Failed" fill="#dc2626" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        )}

                        {/* Campaign Type Distribution */}
                        {data.campaignTypes && (
                            <Card title="Campaign Distribution">
                                <div className={styles.chartContainer}>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={data.campaignTypes}
                                                cx="50%" cy="50%"
                                                innerRadius={60} outerRadius={80}
                                                paddingAngle={5} dataKey="value"
                                            >
                                                {data.campaignTypes.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import api from '../../lib/api';
import styles from './reports.module.css';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { MdDownload, MdChevronLeft, MdChevronRight, MdMoreVert } from 'react-icons/md';

const PIE_COLORS = ['#3b82f6', '#16a34a', '#f59e0b', '#dc2626'];

export default function ReportsPage() {
    const [data, setData] = useState(null);
    const [activity, setActivity] = useState({ activities: [], pagination: { page: 1, pages: 1, total: 0 } });
    const [loading, setLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef(null);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadAnalytics, 30000);
        
        // Close export menu on click outside
        const handleClickOutside = (event) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            clearInterval(interval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([loadAnalytics(), loadActivity(1)]);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAnalytics = async () => {
        try {
            const result = await api.getCampaignAnalytics();
            setData(result);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    };

    const loadActivity = async (page) => {
        setActivityLoading(true);
        try {
            const result = await api.getRecipientActivity({ page, limit: 10 });
            setActivity(result);
        } catch (error) {
            console.error('Failed to load activity:', error);
        } finally {
            setActivityLoading(false);
        }
    };

    const handleExport = (format) => {
        if (!data?.performance?.length) return;
        
        const headers = ['Campaign', 'Sent', 'Delivered', 'Opened', 'Unopened', 'Clicked', 'Failed', 'Spam', 'Forwarded'];
        const rows = data.performance.map(row => [
            row.name, 
            row.sent, 
            row.delivered || 0, 
            row.opened || 0, 
            row.unopened || 0,
            row.clicked || 0, 
            row.failed || 0,
            row.spam || 0,
            row.forwarded || 0
        ]);

        if (format === 'csv') {
            const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
            downloadFile(csvContent, 'campaign_report.csv', 'text/csv');
        } else {
            // Simple Excel XML format
            const xmlContent = generateExcelXML(headers, rows);
            downloadFile(xmlContent, 'campaign_report.xls', 'application/vnd.ms-excel');
        }
        setShowExportMenu(false);
    };

    const downloadFile = (content, fileName, mimeType) => {
        const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const generateExcelXML = (headers, rows) => {
        let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="Sheet1"><Table>`;
        
        // Headers
        xml += '<Row>';
        headers.forEach(h => xml += `<Cell><Data ss:Type="String">${h}</Data></Cell>`);
        xml += '</Row>';
        
        // Rows
        rows.forEach(row => {
            xml += '<Row>';
            row.forEach(cell => {
                const type = typeof cell === 'number' ? 'Number' : 'String';
                xml += `<Cell><Data ss:Type="${type}">${cell}</Data></Cell>`;
            });
            xml += '</Row>';
        });
        
        xml += '</Table></Worksheet></Workbook>';
        return xml;
    };

    const totals = data?.totals || {};
    const hasData = data && (totals.totalSent > 0 || data.performance?.length > 0);

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Analytics & Reports</h1>
                        <p className={styles.subtitle}>Detailed campaign performance and recipient insights</p>
                    </div>
                    <div className={styles.actions}>
                        <div className={styles.exportMenu} ref={exportMenuRef}>
                            <Button variant="outline" onClick={() => setShowExportMenu(!showExportMenu)} disabled={!hasData}>
                                <MdDownload /> Export Data
                            </Button>
                            {showExportMenu && (
                                <div className={styles.exportDropdown}>
                                    <button className={styles.exportItem} onClick={() => handleExport('csv')}>CSV Format</button>
                                    <button className={styles.exportItem} onClick={() => handleExport('excel')}>Excel Format</button>
                                </div>
                            )}
                        </div>
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
                        {/* Primary Metric Cards */}
                        <div className={styles.metricsGrid}>
                            <Card className={styles.metricCard}>
                                <h3>Sent</h3>
                                <div className={styles.metricValue}>{totals.totalSent?.toLocaleString() || 0}</div>
                            </Card>
                            <Card className={styles.metricCard}>
                                <h3>Delivered</h3>
                                <div className={`${styles.metricValue} ${styles.success}`}>{totals.totalDelivered?.toLocaleString() || 0}</div>
                            </Card>
                            <Card className={styles.metricCard}>
                                <h3>Opened</h3>
                                <div className={`${styles.metricValue} ${styles.success}`}>{totals.totalOpened?.toLocaleString() || 0}</div>
                            </Card>
                            <Card className={styles.metricCard}>
                                <h3>Unopened</h3>
                                <div className={styles.metricValue}>{data.totalUnopened?.toLocaleString() || 0}</div>
                            </Card>
                            <Card className={styles.metricCard}>
                                <h3>Clicked</h3>
                                <div className={`${styles.metricValue} ${styles.warning}`}>{totals.totalClicked?.toLocaleString() || 0}</div>
                            </Card>
                            <Card className={styles.metricCard}>
                                <h3>Unsubscribed</h3>
                                <div className={`${styles.metricValue} ${styles.danger}`}>{totals.totalUnsubscribed?.toLocaleString() || 0}</div>
                            </Card>
                            <Card className={styles.metricCard}>
                                <h3>Marked as Spam</h3>
                                <div className={`${styles.metricValue} ${styles.danger}`}>{totals.totalSpam?.toLocaleString() || 0}</div>
                            </Card>
                            <Card className={styles.metricCard}>
                                <h3>Forwarded</h3>
                                <div className={`${styles.metricValue} ${styles.success}`}>{totals.totalForwarded?.toLocaleString() || 0}</div>
                            </Card>
                        </div>

                        {/* Performance Chart */}
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

                        {/* Recipient Activity Table */}
                        <Card title="Recipient-Level Activity" className={styles.fullWidth}>
                            <div className={styles.tableContainer}>
                                {activityLoading ? (
                                    <div className={styles.loading}>Loading activity data...</div>
                                ) : activity.activities && activity.activities.length > 0 ? (
                                    <>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>Recipient</th>
                                                    <th>Campaign</th>
                                                    <th>Status</th>
                                                    <th>Last Activity</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activity.activities.map((a) => (
                                                    <tr key={a.id}>
                                                        <td>
                                                            <div style={{fontWeight:600}}>{a.firstName} {a.lastName}</div>
                                                            <div style={{fontSize:'0.75rem',color:'var(--color-gray-500)'}}>{a.email || a.phone}</div>
                                                        </td>
                                                        <td>
                                                            <div>{a.campaignName}</div>
                                                            <div style={{fontSize:'0.75rem',color:'var(--color-gray-400)'}}>{a.campaignType}</div>
                                                        </td>
                                                        <td>
                                                            <span className={`${styles.badge} ${styles[a.status.toLowerCase()]}`}>
                                                                {a.status}
                                                            </span>
                                                        </td>
                                                        <td>{new Date(a.timestamp).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        
                                        {/* Pagination */}
                                        <div className={styles.pagination}>
                                            <div className={styles.paginationInfo}>
                                                Showing {activity.activities.length} of {activity.pagination.total} activities
                                            </div>
                                            <div className={styles.paginationButtons}>
                                                <Button 
                                                    variant="outline" 
                                                    size="small" 
                                                    disabled={activity.pagination.page === 1}
                                                    onClick={() => loadActivity(activity.pagination.page - 1)}
                                                >
                                                    <MdChevronLeft /> Previous
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="small"
                                                    disabled={activity.pagination.page === activity.pagination.pages}
                                                    onClick={() => loadActivity(activity.pagination.page + 1)}
                                                >
                                                    Next <MdChevronRight />
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className={styles.emptyState}>No activity found</div>
                                )}
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

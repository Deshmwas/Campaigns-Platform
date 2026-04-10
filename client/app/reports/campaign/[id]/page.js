'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import api from '../../../../lib/api';
import styles from './detail.module.css';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';
import { 
    MdKeyboardArrowLeft, MdKeyboardArrowDown, 
    MdFilterList, MdMoreVert, MdInfoOutline 
} from 'react-icons/md';

const COLORS = {
    OPENED: ['#10b981', '#f3f4f6'],
    CLICKED: ['#3b82f6', '#f3f4f6'],
    REPLY: ['#f59e0b', '#f3f4f6'],
};

export default function CampaignDetailReport() {
    const { id } = useParams();
    const router = useRouter();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');

    useEffect(() => {
        loadReport();
    }, [id]);

    const loadReport = async () => {
        try {
            const response = await fetch(`${api.baseUrl}/api/reports/campaign/${id}`, {
                headers: {
                    'Authorization': `Bearer ${api.getToken()}`
                }
            });
            const data = await response.json();
            setReport(data);
        } catch (error) {
            console.error('Failed to load detailed report:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <DashboardLayout><div className={styles.loading}>Loading detailed report...</div></DashboardLayout>;
    if (!report) return <DashboardLayout><div className={styles.error}>Report not found</div></DashboardLayout>;

    const { campaign, metrics, charts } = report;

    return (
        <DashboardLayout>
            <div className={styles.container}>
                {/* Top Navigation Bar */}
                <div className={styles.topNav}>
                    <div className={styles.breadcrumbs}>
                        Reports &gt; Sent Campaigns &gt; {campaign.name}
                    </div>
                    <div className={styles.campaignHeader}>
                        <h1 className={styles.campaignTitle}>
                            {campaign.name} <MdKeyboardArrowDown />
                        </h1>
                        <p className={styles.campaignMeta}>
                            <span className={styles.statusDot}></span> Sent On {new Date(campaign.sentAt).toLocaleString()}
                        </p>
                    </div>
                    <div className={styles.topActions}>
                        <Button variant="outline" size="small"><MdFilterList /> Bot filter enabled</Button>
                        <Button variant="primary" size="small">Send Follow-up</Button>
                        <Button variant="outline" size="small">More <MdKeyboardArrowDown /></Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button 
                        className={`${styles.tab} ${activeTab === 'summary' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('summary')}
                    >
                        Report Summary
                    </button>
                    <button className={styles.tab}>Recipient Activities</button>
                    <button className={styles.tab}>Click Activities <MdKeyboardArrowDown /></button>
                    <button className={styles.tab}>Bounces and Auto-replies</button>
                    <button className={styles.tab}><MdMoreVert /></button>
                </div>

                {/* Primary Metrics Bar */}
                <div className={styles.metricsBar}>
                    <div className={styles.metricItem}>
                        <div className={styles.metricValue}>{metrics.sent.toLocaleString()}</div>
                        <div className={styles.metricLabel}>Sent</div>
                    </div>
                    <div className={styles.metricItem}>
                        <div className={styles.metricValue}>{metrics.delivered.toLocaleString()}</div>
                        <div className={styles.metricLabel}>Delivered</div>
                    </div>
                    <div className={styles.metricItem}>
                        <div className={styles.metricValue}>{metrics.opened.toLocaleString()}</div>
                        <div className={styles.metricLabel}>Opened</div>
                    </div>
                    <div className={styles.metricItem}>
                        <div className={styles.metricValue}>{metrics.unopened.toLocaleString()}</div>
                        <div className={styles.metricLabel}>Unopened</div>
                    </div>
                    <div className={styles.metricItem}>
                        <div className={styles.metricValue}>{metrics.clicked.toLocaleString()}</div>
                        <div className={styles.metricLabel}>Clicked</div>
                    </div>
                    <div className={styles.metricItem}>
                        <div className={styles.metricValue}>{metrics.unsubscribed.toLocaleString()}</div>
                        <div className={styles.metricLabel}>Unsubscribed</div>
                    </div>
                    <div className={styles.metricItem}>
                        <div className={styles.metricValue}>{metrics.spam.toLocaleString()}</div>
                        <div className={styles.metricLabel}>Marked spam</div>
                    </div>
                    <div className={styles.metricItem}>
                        <div className={styles.metricValue}>{metrics.forwarded.toLocaleString()}</div>
                        <div className={styles.metricLabel}>Forwarded</div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className={styles.chartsGrid}>
                    {/* Opens Stats */}
                    <Card className={styles.chartCard} noPadding>
                        <div className={styles.cardHeader}>
                            <h3>Opens Stats <MdInfoOutline className={styles.infoIcon} /></h3>
                        </div>
                        <div className={styles.donutLayout}>
                            <div className={styles.donutContainer}>
                                <ResponsiveContainer width="100%" height={150}>
                                    <PieChart>
                                        <Pie
                                            data={charts.engagement}
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={0}
                                            dataKey="value"
                                            startAngle={90}
                                            endAngle={450}
                                        >
                                            <Cell fill="#10b981" />
                                            <Cell fill="#f3f4f6" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className={styles.donutCenter}>
                                    <div className={styles.centerValue}>{((metrics.opened/metrics.delivered)*100).toFixed(1)}%</div>
                                </div>
                            </div>
                            <div className={styles.donutStats}>
                                <div className={styles.rateDisplay}>
                                    <span>Opens rate <MdInfoOutline /></span>
                                    <strong>{((metrics.opened/metrics.delivered)*100).toFixed(1)}% <span className={styles.smallCount}>{metrics.opened}</span></strong>
                                    <p className={styles.tiny}>Including bots, the open rate would be {(((metrics.opened + 20)/metrics.delivered)*100).toFixed(1)}%</p>
                                </div>
                                <div className={styles.splitStats}>
                                    <div className={styles.splitItem}>
                                        <span className={styles.dot} style={{backgroundColor: '#10b981'}}></span>
                                        <span>Reliable opens <MdInfoOutline /></span>
                                        <div className={styles.splitVal}><strong>{metrics.reliableOpens}</strong> <span>{((metrics.reliableOpens/metrics.opened)*100 || 0).toFixed(1)}%</span></div>
                                    </div>
                                    <div className={styles.splitItem}>
                                        <span className={styles.dot} style={{backgroundColor: '#3b82f6'}}></span>
                                        <span>Apple MPP opens <MdInfoOutline /></span>
                                        <div className={styles.splitVal}><strong>{metrics.mppOpens}</strong> <span>{((metrics.mppOpens/metrics.opened)*100 || 0).toFixed(1)}%</span></div>
                                    </div>
                                </div>
                                <div className={styles.totalFooter}>Total opens <MdInfoOutline /> {metrics.opened}</div>
                            </div>
                        </div>
                    </Card>

                    {/* Clicks Stats */}
                    <Card className={styles.chartCard} noPadding>
                        <div className={styles.cardHeader}>
                            <h3>Clicks Stats <MdInfoOutline className={styles.infoIcon} /></h3>
                        </div>
                        <div className={styles.donutLayout}>
                            <div className={styles.donutContainer}>
                                <ResponsiveContainer width="100%" height={150}>
                                    <PieChart>
                                        <Pie
                                            data={charts.clicks}
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={0}
                                            dataKey="value"
                                            startAngle={90}
                                            endAngle={450}
                                        >
                                            <Cell fill="#3b82f6" />
                                            <Cell fill="#f3f4f6" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className={styles.donutCenter}>
                                    <div className={styles.centerValue}>{((metrics.clicked/metrics.delivered)*100).toFixed(1)}%</div>
                                </div>
                            </div>
                            <div className={styles.donutStats}>
                                <div className={styles.rateDisplay}>
                                    <span>Clicks rate <MdInfoOutline /></span>
                                    <strong>{((metrics.clicked/metrics.delivered)*100).toFixed(1)}% <span className={styles.smallCount}>{metrics.clicked}</span></strong>
                                    <p className={styles.tiny}>Including bots, the click rate would be {(((metrics.clicked + 5)/metrics.delivered)*100).toFixed(1)}%</p>
                                </div>
                                <div className={styles.splitStats}>
                                    <div className={styles.splitItem}>
                                        <span className={styles.dot} style={{backgroundColor: '#10b981'}}></span>
                                        <span>Reliable clicks <MdInfoOutline /></span>
                                        <div className={styles.splitVal}><strong>{metrics.clicked}</strong> <span>100%</span></div>
                                    </div>
                                </div>
                                <div className={styles.totalFooter}>Total clicks <MdInfoOutline /> {metrics.clicked}</div>
                            </div>
                        </div>
                        <div className={styles.cardFooter}>
                            <div className={styles.ctrLine}>
                                <span>Click-through rate <MdInfoOutline /></span>
                                <span className={styles.ctrVal}>{((metrics.clicked/metrics.opened)*100 || 0).toFixed(1)}%</span>
                            </div>
                            <div className={styles.ctrBar}><div className={styles.ctrProgress} style={{width: `${(metrics.clicked/metrics.opened)*100}%`}}></div></div>
                        </div>
                    </Card>

                    {/* Reply Stats */}
                    <Card className={styles.chartCard} noPadding>
                        <div className={styles.cardHeader}>
                            <h3>Reply Stats <MdInfoOutline className={styles.infoIcon} /></h3>
                        </div>
                        <div className={styles.donutLayout}>
                            <div className={styles.donutContainer}>
                                <ResponsiveContainer width="100%" height={150}>
                                    <PieChart>
                                        <Pie
                                            data={[{value: metrics.replies}, {value: metrics.delivered - metrics.replies}]}
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={0}
                                            dataKey="value"
                                            startAngle={90}
                                            endAngle={450}
                                        >
                                            <Cell fill="#f59e0b" />
                                            <Cell fill="#f3f4f6" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className={styles.donutCenter}>
                                    <div className={styles.centerValue}>{((metrics.replies/metrics.delivered)*100).toFixed(1)}%</div>
                                </div>
                            </div>
                            <div className={styles.donutStats}>
                                <div className={styles.rateDisplay}>
                                    <span>Replies rate <MdInfoOutline /></span>
                                    <strong>{((metrics.replies/metrics.delivered)*100).toFixed(1)}% <span className={styles.smallCount}>{metrics.replies}</span></strong>
                                </div>
                                <div className={styles.splitStats}>
                                    <div className={styles.splitItem}>
                                        <span className={styles.dot} style={{backgroundColor: '#f59e0b'}}></span>
                                        <span>Auto reply <MdInfoOutline /></span>
                                        <div className={styles.splitVal}><strong>{metrics.replies}</strong> <span>{((metrics.replies/metrics.delivered)*100).toFixed(1)}%</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Opens by Time Chart */}
                <Card title="Opens by Time" className={styles.fullWidth}>
                    <div className={styles.timeChartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={charts.timeSeries}>
                                <defs>
                                    <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis 
                                    dataKey="timestamp" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                                    tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                <RechartsTooltip 
                                    labelFormatter={(val) => new Date(val).toLocaleString()}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="opens" 
                                    stroke="#10b981" 
                                    strokeWidth={2}
                                    fillOpacity={1} 
                                    fill="url(#colorOpens)" 
                                    name="Opens" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import api from '../../../lib/api';
import styles from './sent.module.css';
import { 
    MdSearch, MdFilterList, MdFileDownload, MdCompare, 
    MdFormatListBulleted, MdGridView, MdKeyboardArrowDown,
    MdEmail, MdFolderOpen
} from 'react-icons/md';

export default function CampaignReportsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
    const [compareMode, setCompareMode] = useState(false);
    const [selectedCompareIds, setSelectedCompareIds] = useState([]);

    useEffect(() => {
        loadCampaignData();
    }, []);

    const loadCampaignData = async () => {
        try {
            // New endpoint we created earlier
            const response = await fetch(`${api.baseUrl}/api/reports/campaigns`, {
                headers: {
                    'Authorization': `Bearer ${api.getToken()}`
                }
            });
            const data = await response.json();
            setCampaigns(data || []);
        } catch (error) {
            console.error('Failed to load campaign reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCampaigns = campaigns.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const exportToCSV = () => {
        if (filteredCampaigns.length === 0) {
            alert("No reports to export.");
            return;
        }
        
        const headers = ["Campaign Name", "Type", "Sent Date", "Delivered Rate (%)", "Open Rate (%)", "Click Rate (%)", "Total Sent", "Total Delivered", "Total Opened", "Total Clicked"];
        const rows = filteredCampaigns.map(c => [
            `"${c.name}"`, 
            c.type, 
            `"${new Date(c.sentAt).toLocaleString()}"`, 
            c.deliveredRate.toFixed(2), 
            c.openRate.toFixed(2), 
            c.clickRate.toFixed(2),
            c.stats?.sent || 0,
            c.stats?.delivered || 0,
            c.stats?.opened || 0,
            c.stats?.clicked || 0
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `campaign_reports_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCompareClick = () => {
        if (compareMode) {
            if (selectedCompareIds.length === 2) {
                router.push(`/reports/compare?ids=${selectedCompareIds.join(',')}`);
            } else {
                setCompareMode(false);
                setSelectedCompareIds([]);
            }
        } else {
            setCompareMode(true);
            setSelectedCompareIds([]);
            setViewMode('list'); // switch to list view for easier selection
        }
    };

    const toggleCompareSelect = (e, id) => {
        e.stopPropagation();
        if (selectedCompareIds.includes(id)) {
            setSelectedCompareIds(prev => prev.filter(i => i !== id));
        } else {
            if (selectedCompareIds.length >= 2) {
                alert("You can only compare up to 2 campaigns at a time.");
                return;
            }
            setSelectedCompareIds(prev => [...prev, id]);
        }
    };

    return (
        <DashboardLayout>
            <div className={styles.container}>
                {/* Breadcrumbs */}
                <div className={styles.breadcrumbs}>
                    Reports &gt; Sent Campaigns
                </div>

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1 className={styles.title}>All Campaigns <MdKeyboardArrowDown /></h1>
                        <span className={styles.folderIcon}><MdFolderOpen /> <MdKeyboardArrowDown /></span>
                    </div>
                    
                    <div className={styles.headerActions}>
                        <div className={styles.viewToggles}>
                            <button 
                                className={`${styles.viewToggle} ${viewMode === 'list' ? styles.active : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                <MdFormatListBulleted />
                            </button>
                            <button 
                                className={`${styles.viewToggle} ${viewMode === 'grid' ? styles.active : ''}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <MdGridView />
                            </button>
                        </div>
                        <Button variant="outline" className={styles.exportBtn} onClick={exportToCSV}>
                            <MdFileDownload /> Export Reports
                        </Button>
                        <Button 
                            variant={compareMode && selectedCompareIds.length === 2 ? "primary" : compareMode ? "outline" : "primary"} 
                            className={styles.compareBtn} 
                            onClick={handleCompareClick}
                        >
                            <MdCompare /> {compareMode ? (selectedCompareIds.length === 2 ? 'Run Comparison' : `Cancel Compare (${selectedCompareIds.length}/2 selected)`) : 'Compare Campaigns'}
                        </Button>
                    </div>
                </div>

                <div className={styles.mainLayout}>
                    {/* Sidebar Filters */}
                    <div className={styles.sidebar}>
                        <h3 className={styles.filterGroupTitle}>FILTER BY</h3>
                        
                        <div className={styles.filterSection}>
                            <label className={styles.checkboxLabel}>
                                <input type="checkbox" checked readOnly />
                                <span>Campaign Owner</span>
                            </label>
                            <div className={styles.tagWrapper}>
                                <span className={styles.tag}>Me <button className={styles.tagClose}>×</button></span>
                            </div>
                            <div className={styles.selectPlaceholder}>Select users</div>
                        </div>

                        <div className={styles.filterSection}>
                            <label className={styles.checkboxLabel}>
                                <input type="checkbox" />
                                <span>Sent Date</span>
                            </label>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className={styles.content}>
                        <div className={styles.searchBarWrapper}>
                            <div className={styles.searchIcon}><MdSearch /></div>
                            <input 
                                type="text" 
                                className={styles.searchInput} 
                                placeholder="Select All" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className={styles.sortBy}>
                                Sort by : <strong>Recently Sent</strong> <MdKeyboardArrowDown />
                            </div>
                        </div>

                        {loading ? (
                            <div className={styles.loading}>Loading campaign reports...</div>
                        ) : (
                            <div className={viewMode === 'list' ? styles.campaignList : styles.campaignGrid}>
                                {filteredCampaigns.map(campaign => {
                                    const isSelected = selectedCompareIds.includes(campaign.id);
                                    
                                    if (viewMode === 'grid') {
                                        return (
                                            <div 
                                                key={campaign.id} 
                                                className={styles.campaignGridCard}
                                                onClick={() => router.push(`/reports/campaign/${campaign.id}`)}
                                                style={compareMode ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                            >
                                                <div className={styles.gridHeader}>
                                                    <div className={styles.campaignIcon}>
                                                        <div className={styles.envelopeIcon} style={{ fontSize: '2rem' }}>
                                                            <MdEmail />
                                                        </div>
                                                    </div>
                                                    <div className={styles.campaignInfo}>
                                                        <h3 className={styles.campaignName} style={{ fontSize: '1rem', marginBottom: 4 }}>{campaign.name}</h3>
                                                        <p className={styles.campaignDate} style={{ fontSize: '0.75rem' }}>
                                                            <span className={styles.statusDot}></span> 
                                                            {new Date(campaign.sentAt).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={styles.gridStats}>
                                                    <div className={styles.statWidget}>
                                                        <div className={styles.statValue}>{campaign.openRate.toFixed(1)}%</div>
                                                        <div className={styles.statLabel}>Opened</div>
                                                    </div>
                                                    <div className={styles.statWidget}>
                                                        <div className={styles.statValue}>{campaign.clickRate.toFixed(1)}%</div>
                                                        <div className={styles.statLabel}>Clicked</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div 
                                            key={campaign.id} 
                                            className={styles.campaignRow}
                                            onClick={() => {
                                                if (compareMode) {
                                                    toggleCompareSelect({ stopPropagation: () => {} }, campaign.id);
                                                } else {
                                                    router.push(`/reports/campaign/${campaign.id}`);
                                                }
                                            }}
                                            style={isSelected ? { background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6' } : {}}
                                        >
                                            <div className={styles.campaignIcon} style={{ display: 'flex', alignItems: 'center' }}>
                                                {compareMode ? (
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected} 
                                                        readOnly 
                                                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                                                    />
                                                ) : (
                                                    <div className={styles.envelopeIcon}>
                                                        <MdEmail />
                                                        <span className={styles.atSign}>@</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className={styles.campaignInfo}>
                                                <h3 className={styles.campaignName}>{campaign.name}</h3>
                                                <p className={styles.campaignDate}>
                                                    <span className={styles.statusDot}></span> 
                                                    Sent On {new Date(campaign.sentAt).toLocaleString('en-US', { 
                                                        month: 'short', day: '2-digit', year: 'numeric', 
                                                        hour: '2-digit', minute: '2-digit', hour12: true 
                                                    })}
                                                </p>
                                            </div>

                                            <div className={styles.statsGroup}>
                                                <div className={styles.statWidget}>
                                                    <div className={styles.statValue}>{campaign.deliveredRate.toFixed(1)}%</div>
                                                    <div className={styles.statLabel}>Delivered</div>
                                                    <div className={styles.progressBar}>
                                                        <div className={styles.progressFill} style={{ width: `${campaign.deliveredRate}%`, backgroundColor: '#10b981' }}></div>
                                                    </div>
                                                </div>
                                                <div className={styles.statWidget}>
                                                    <div className={styles.statValue}>{campaign.openRate.toFixed(1)}%</div>
                                                    <div className={styles.statLabel}>Opened</div>
                                                    <div className={styles.progressBar}>
                                                        <div className={styles.progressFill} style={{ width: `${campaign.openRate}%`, backgroundColor: '#10b981' }}></div>
                                                    </div>
                                                </div>
                                                <div className={styles.statWidget}>
                                                    <div className={styles.statValue}>{campaign.clickRate.toFixed(1)}%</div>
                                                    <div className={styles.statLabel}>Clicked</div>
                                                    <div className={styles.progressBar}>
                                                        <div className={styles.progressFill} style={{ width: `${campaign.clickRate}%`, backgroundColor: '#10b981' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

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
                            <button className={styles.viewToggle}><MdFormatListBulleted /></button>
                            <button className={`${styles.viewToggle} ${styles.active}`}><MdGridView /></button>
                        </div>
                        <Button variant="outline" className={styles.exportBtn}>Export Reports</Button>
                        <Button variant="primary" className={styles.compareBtn}>Compare Campaigns</Button>
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
                            <div className={styles.campaignList}>
                                {filteredCampaigns.map(campaign => (
                                    <div 
                                        key={campaign.id} 
                                        className={styles.campaignRow}
                                        onClick={() => router.push(`/reports/campaign/${campaign.id}`)}
                                    >
                                        <div className={styles.campaignIcon}>
                                            <div className={styles.envelopeIcon}>
                                                <MdEmail />
                                                <span className={styles.atSign}>@</span>
                                            </div>
                                        </div>
                                        
                                        <div className={styles.campaignInfo}>
                                            <h3 className={styles.campaignName}>{campaign.name}</h3>
                                            <p className={styles.campaignDate}>
                                                <span className={styles.statusDot}></span> 
                                                Sent On {new Date(campaign.sentAt).toLocaleString('en-US', { 
                                                    month: 'short', day: '2-digit', year: 'numeric', 
                                                    hour: '2-digit', minute: '2-digit', hour12: true 
                                                })} EAT
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
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

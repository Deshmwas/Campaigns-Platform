'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import api from '../../lib/api';
import styles from './campaigns.module.css';
import { MdAdd, MdEmail, MdSms, MdSend, MdDelete, MdVisibility, MdRefresh } from 'react-icons/md';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../context/ToastContext';

export default function CampaignsPage() {
    const router = useRouter();
    const toast = useToast();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [confirmState, setConfirmState] = useState({ isOpen: false, type: null, payload: null });

    useEffect(() => {
        loadCampaigns();
    }, [filter]);

    const loadCampaigns = async () => {
        try {
            const params = filter !== 'all' ? { type: filter.toUpperCase() } : {};
            const data = await api.getCampaigns(params);
            setCampaigns(data.campaigns || []);
        } catch (error) {
            console.error('Failed to load campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const confirmSend = (campaignId) => {
        setConfirmState({ isOpen: true, type: 'SEND', payload: campaignId });
    };

    const confirmRetry = (campaignId, failedCount) => {
        setConfirmState({ isOpen: true, type: 'RETRY', payload: campaignId, failedCount });
    };

    const confirmDelete = (campaignId) => {
        setConfirmState({ isOpen: true, type: 'DELETE', payload: campaignId });
    };

    const handleConfirmAction = async () => {
        const { type, payload } = confirmState;
        setConfirmState({ isOpen: false, type: null, payload: null });

        if (type === 'SEND') {
            try {
                const res = await api.sendCampaign(payload);
                toast.success(res?.message || 'Campaign is being sent!');
                loadCampaigns();
            } catch (error) {
                toast.error('Failed to send campaign: ' + error.message);
            }
        } else if (type === 'RETRY') {
            try {
                const res = await api.retryFailedCampaign(payload);
                toast.success(res?.message || 'Retrying failed recipients!');
                loadCampaigns();
            } catch (error) {
                toast.error('Failed to retry: ' + error.message);
            }
        } else if (type === 'DELETE') {
            setCampaigns(prev => prev.filter(c => c.id !== payload));
            try {
                await api.deleteCampaign(payload);
                toast.success('Campaign deleted successfully');
            } catch (error) {
                toast.error('Failed to delete campaign: ' + error.message);
                loadCampaigns();
            }
        }
    };

    const getStatusClass = (status) => {
        const map = {
            DRAFT: styles.statusDraft,
            SCHEDULED: styles.statusScheduled,
            SENDING: styles.statusSending,
            SENT: styles.statusSent,
            FAILED: styles.statusFailed,
            PAUSED: styles.statusPaused,
        };
        return map[status] || '';
    };

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Campaigns</h1>
                        <p className={styles.subtitle}>Manage your email and SMS campaigns</p>
                    </div>
                    <Button onClick={() => router.push('/campaigns/new')}>
                        <MdAdd /> Create Campaign
                    </Button>
                </div>

                <div className={styles.filters}>
                    <button
                        className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`${styles.filterButton} ${filter === 'email' ? styles.active : ''}`}
                        onClick={() => setFilter('email')}
                    >
                        <MdEmail /> Email
                    </button>
                    <button
                        className={`${styles.filterButton} ${filter === 'sms' ? styles.active : ''}`}
                        onClick={() => setFilter('sms')}
                    >
                        <MdSms /> SMS
                    </button>
                </div>

                {loading ? (
                    <div className={styles.loading}>Loading campaigns...</div>
                ) : campaigns.length === 0 ? (
                    <div className={styles.tableContainer}>
                        <div className={styles.empty}>
                            <p>No campaigns found</p>
                            <Button onClick={() => router.push('/campaigns/new')}>
                                Create your first campaign
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.tableContainer}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Campaign Name</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Recipients</th>
                                        <th>Sent</th>
                                        <th>Failed</th>
                                        <th>Opened</th>
                                        <th>Date Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {campaigns.map((campaign) => (
                                        <tr key={campaign.id} className={styles.tableRow}>
                                            <td className={styles.nameCell}>
                                                <span
                                                    className={styles.campaignLink}
                                                    onClick={() => router.push(`/campaigns/${campaign.id}`)}
                                                >
                                                    {campaign.name}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.typeBadge} ${styles[campaign.type.toLowerCase()]}`}>
                                                    {campaign.type === 'EMAIL' ? <MdEmail /> : <MdSms />}
                                                    {campaign.type}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${getStatusClass(campaign.status)}`}>
                                                    {campaign.status}
                                                </span>
                                            </td>
                                            <td>{campaign._count?.recipients || 0}</td>
                                            <td>{campaign.stats?.sentCount || 0}</td>
                                            <td>
                                                {(campaign.stats?.failedCount || 0) > 0 ? (
                                                    <span className={styles.failedCount}>{campaign.stats.failedCount}</span>
                                                ) : (
                                                    <span>0</span>
                                                )}
                                            </td>
                                            <td>{campaign.stats?.openedCount || 0}</td>
                                            <td className={styles.dateCell}>
                                                {new Date(campaign.createdAt).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <button
                                                        className={styles.actionBtn}
                                                        onClick={() => router.push(`/campaigns/${campaign.id}`)}
                                                        title="View Details"
                                                    >
                                                        <MdVisibility />
                                                    </button>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.sendBtn}`}
                                                        onClick={() => confirmSend(campaign.id)}
                                                        title="Send Now"
                                                    >
                                                        <MdSend />
                                                    </button>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.retryBtn}`}
                                                        onClick={() => confirmRetry(campaign.id, campaign.stats?.failedCount)}
                                                        title="Resend Failed"
                                                    >
                                                        <MdRefresh />
                                                    </button>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                        onClick={() => confirmDelete(campaign.id)}
                                                        title="Delete"
                                                    >
                                                        <MdDelete />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <ConfirmModal 
                    isOpen={confirmState.isOpen}
                    title={confirmState.type === 'SEND' ? 'Send Campaign' : confirmState.type === 'RETRY' ? 'Resend Failed Emails' : 'Delete Campaign'}
                    message={
                        confirmState.type === 'SEND' 
                            ? 'Are you sure you want to officially dispatch this campaign to all recipients?' 
                            : confirmState.type === 'RETRY'
                            ? `Are you sure you want to resend to the ${confirmState.failedCount || 0} failed recipient(s)? They will be re-queued for delivery.`
                            : 'Are you sure you want to delete this campaign? This action cannot be undone and will permanently cancel any active deliveries.'
                    }
                    confirmText={confirmState.type === 'SEND' ? 'Send Now' : confirmState.type === 'RETRY' ? 'Resend Now' : 'Delete'}
                    variant={confirmState.type === 'DELETE' ? 'danger' : 'primary'}
                    onConfirm={handleConfirmAction}
                    onCancel={() => setConfirmState({ isOpen: false, type: null, payload: null })}
                />
            </div>
        </DashboardLayout>
    );
}

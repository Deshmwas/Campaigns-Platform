'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import api from '../../../lib/api';
import styles from './detail.module.css';
import { MdArrowBack, MdSend, MdDelete, MdEmail, MdSms } from 'react-icons/md';
import ConfirmModal from '../../../components/ConfirmModal';
import { useToast } from '../../../context/ToastContext';

export default function CampaignDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const toast = useToast();
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmState, setConfirmState] = useState({ isOpen: false, type: null });

    useEffect(() => {
        loadCampaign();
    }, [id]);

    const loadCampaign = async () => {
        try {
            const data = await api.getCampaign(id);
            setCampaign(data);
        } catch (error) {
            console.error('Failed to load campaign:', error);
        } finally {
            setLoading(false);
        }
    };

    const confirmSend = () => setConfirmState({ isOpen: true, type: 'SEND' });
    const confirmRetry = () => setConfirmState({ isOpen: true, type: 'RETRY' });
    const confirmDelete = () => setConfirmState({ isOpen: true, type: 'DELETE' });

    const handleConfirmAction = async () => {
        const type = confirmState.type;
        setConfirmState({ isOpen: false, type: null });

        if (type === 'SEND') {
            try {
                const res = await api.sendCampaign(id);
                toast.success(res?.message || 'Campaign is being sent!');
                loadCampaign();
            } catch (error) {
                toast.error('Failed to send campaign: ' + error.message);
            }
        } else if (type === 'RETRY') {
            try {
                const res = await api.retryFailedCampaign(id);
                toast.success(res?.message || 'Retrying failed recipients!');
                loadCampaign();
            } catch (error) {
                toast.error('Failed to retry campaign: ' + error.message);
            }
        } else if (type === 'DELETE') {
            try {
                await api.deleteCampaign(id);
                toast.success('Campaign deleted successfully');
                router.push('/campaigns');
            } catch (error) {
                toast.error('Failed to delete campaign: ' + error.message);
            }
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className={styles.loading}>Loading campaign...</div>
            </DashboardLayout>
        );
    }

    if (!campaign) {
        return (
            <DashboardLayout>
                <div className={styles.loading}>
                    <h2>Campaign not found</h2>
                    <Button onClick={() => router.push('/campaigns')}>Back to Campaigns</Button>
                </div>
            </DashboardLayout>
        );
    }

    const stats = campaign.stats || {};
    const recipients = campaign.recipients || [];

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <button className={styles.backBtn} onClick={() => router.push('/campaigns')}>
                    <MdArrowBack /> Back to Campaigns
                </button>

                <div className={styles.header}>
                    <div>
                        <div className={styles.titleRow}>
                            <h1 className={styles.title}>{campaign.name}</h1>
                            <span className={`${styles.typeBadge} ${styles[campaign.type.toLowerCase()]}`}>
                                {campaign.type === 'EMAIL' ? <MdEmail /> : <MdSms />}
                                {campaign.type}
                            </span>
                            <span className={`${styles.statusBadge} ${styles[`status${campaign.status}`]}`}>
                                {campaign.status}
                            </span>
                        </div>
                        {campaign.subject && <p className={styles.subject}>Subject: {campaign.subject}</p>}
                        <p className={styles.date}>Created: {new Date(campaign.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className={styles.actions}>
                        <Button onClick={confirmSend}>
                            <MdSend /> Send Now
                        </Button>
                        <Button variant="outline" onClick={confirmRetry} className={styles.retryBtn}>
                            <MdSend /> Retry Failed
                        </Button>
                        <Button variant="outline" onClick={confirmDelete}>
                            <MdDelete /> Delete
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>{stats.totalRecipients || 0}</div>
                        <div className={styles.statLabel}>Total Recipients</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statValue} ${styles.blue}`}>{stats.sentCount || 0}</div>
                        <div className={styles.statLabel}>Sent</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statValue} ${styles.green}`}>{stats.deliveredCount || 0}</div>
                        <div className={styles.statLabel}>Delivered</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statValue} ${styles.teal}`}>{stats.openedCount || 0}</div>
                        <div className={styles.statLabel}>Opened</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statValue} ${styles.amber}`}>{stats.clickedCount || 0}</div>
                        <div className={styles.statLabel}>Clicked</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statValue} ${styles.red}`}>{stats.failedCount || 0}</div>
                        <div className={styles.statLabel}>Failed</div>
                    </div>
                </div>

                {/* Content Preview */}
                {campaign.type === 'EMAIL' && campaign.content && (
                    <Card title="Email Preview">
                        <div className={styles.previewFrame}>
                            <iframe
                                srcDoc={campaign.content}
                                title="Email Preview"
                                className={styles.iframe}
                            />
                        </div>
                    </Card>
                )}

                {campaign.type === 'SMS' && campaign.content && (
                    <Card title="SMS Message">
                        <div className={styles.smsPreview}>
                            <p>{campaign.content}</p>
                            <span className={styles.charCount}>
                                {campaign.content.length} characters ({Math.ceil(campaign.content.length / 160)} segment{Math.ceil(campaign.content.length / 160) !== 1 ? 's' : ''})
                            </span>
                        </div>
                    </Card>
                )}

                {/* Recipients Table */}
                <Card title={`Recipients (${recipients.length})`}>
                    {recipients.length === 0 ? (
                        <div className={styles.empty}>No recipients found</div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>{campaign.type === 'EMAIL' ? 'Email' : 'Phone'}</th>
                                        <th>Status</th>
                                        <th>Sent At</th>
                                        <th>Error</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recipients.map((r) => (
                                        <tr key={r.id}>
                                            <td>{r.contact?.firstName || ''} {r.contact?.lastName || ''}</td>
                                            <td>{campaign.type === 'EMAIL' ? r.contact?.email : r.contact?.phone}</td>
                                            <td>
                                                <span className={`${styles.recipientStatus} ${styles[`rs${r.status}`]}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td>{r.sentAt ? new Date(r.sentAt).toLocaleString() : '-'}</td>
                                            <td className={styles.errorCell}>{r.errorMessage || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                <ConfirmModal 
                    isOpen={confirmState.isOpen}
                    title={confirmState.type === 'SEND' ? 'Send Campaign' : confirmState.type === 'RETRY' ? 'Retry Failed Emails' : 'Delete Campaign'}
                    message={confirmState.type === 'SEND' ? 'Are you sure you want to officially dispatch this campaign to all recipients?' : confirmState.type === 'RETRY' ? `Are you sure you want to retry sending to the ${stats.failedCount} failed recipients?` : 'Are you sure you want to delete this campaign? This action cannot be undone and will permanently cancel any active deliveries.'}
                    confirmText={confirmState.type === 'SEND' ? 'Send Now' : confirmState.type === 'RETRY' ? 'Retry Now' : 'Delete'}
                    variant={confirmState.type === 'DELETE' ? 'danger' : 'primary'}
                    onConfirm={handleConfirmAction}
                    onCancel={() => setConfirmState({ isOpen: false, type: null })}
                />
            </div>
        </DashboardLayout>
    );
}

'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import api from '../../lib/api';
import styles from './senders.module.css';
import { MdAdd, MdEmail, MdCheck, MdClose, MdPlayArrow, MdDelete, MdEdit, MdSend, MdCloud } from 'react-icons/md';

const EMPTY_FORM = {
    name: '', email: '',
    providerType: 'smtp',
    // SMTP fields
    smtpHost: '', smtpPort: 587, smtpUsername: '', smtpPassword: '', encryption: 'TLS',
    // Mailgun fields
    mailgunApiKey: '', mailgunDomain: '',
};

const SMTP_PRESETS = {
    gmail:   { host: 'smtp.gmail.com',       port: 587, encryption: 'TLS' },
    outlook: { host: 'smtp.office365.com',   port: 587, encryption: 'TLS' },
    zoho:    { host: 'smtp.zoho.com',        port: 465, encryption: 'SSL' },
    icloud:  { host: 'smtp.mail.me.com',     port: 587, encryption: 'TLS' },
    custom:  { host: '', port: 587, encryption: 'TLS' },
};

export default function SendersPage() {
    const [senders, setSenders]         = useState([]);
    const [loading, setLoading]         = useState(true);
    const [showModal, setShowModal]     = useState(false);
    const [editing, setEditing]         = useState(null);
    const [testing, setTesting]         = useState(null);
    const [testResult, setTestResult]   = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [smtpPreset, setSmtpPreset]   = useState('custom');
    const [form, setForm]               = useState(EMPTY_FORM);
    const [sendTestModal, setSendTestModal] = useState(null);
    const [testEmailAddr, setTestEmailAddr] = useState('');
    const [sendingTest, setSendingTest] = useState(false);

    useEffect(() => { loadSenders(); }, []);

    const loadSenders = async () => {
        try {
            const data = await api.getSenders();
            setSenders(data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const openAdd = () => {
        setForm(EMPTY_FORM);
        setSmtpPreset('custom');
        setEditing(null);
        setShowAdvanced(false);
        setShowModal(true);
    };

    const handleSmtpPresetChange = (val) => {
        setSmtpPreset(val);
        if (val !== 'custom') {
            const p = SMTP_PRESETS[val];
            setForm(prev => ({ ...prev, smtpHost: p.host, smtpPort: p.port, encryption: p.encryption }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name:         form.name,
                email:        form.email,
                providerType: form.providerType,
            };

            if (form.providerType === 'mailgun') {
                payload.mailgunApiKey  = form.mailgunApiKey;
                payload.mailgunDomain  = form.mailgunDomain;
            } else {
                payload.smtpHost      = form.smtpHost;
                payload.smtpPort      = form.smtpPort;
                payload.smtpUsername  = form.smtpUsername;
                payload.smtpPassword  = form.smtpPassword;
                payload.encryption    = form.encryption;
            }

            if (editing) {
                await api.updateSender(editing, payload);
            } else {
                await api.createSender(payload);
            }
            setShowModal(false);
            setEditing(null);
            loadSenders();
        } catch (err) { alert(err.message); }
    };

    const handleEdit = (sender) => {
        setForm({
            name:         sender.name,
            email:        sender.email,
            providerType: sender.providerType || 'smtp',
            smtpHost:     sender.smtpHost || '',
            smtpPort:     sender.smtpPort || 587,
            smtpUsername: sender.smtpUsername || '',
            smtpPassword: '',
            encryption:   sender.encryption || 'TLS',
            mailgunApiKey: '',
            mailgunDomain: sender.mailgunDomain || '',
        });
        setSmtpPreset('custom');
        setEditing(sender.id);
        setShowAdvanced(false);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this sender account?')) return;
        try { await api.deleteSender(id); loadSenders(); }
        catch (err) { alert(err.message); }
    };

    const handleTest = async (id) => {
        setTesting(id); setTestResult(null);
        try {
            const result = await api.testSender(id);
            setTestResult({ id, ...result });
            if (result.success) loadSenders();
        } catch (err) { setTestResult({ id, success: false, message: err.message }); }
        finally { setTesting(null); }
    };

    const handleSendTestEmail = async () => {
        if (!sendTestModal || !testEmailAddr) return;
        setSendingTest(true);
        try {
        const result = await api.sendTestEmail(sendTestModal, testEmailAddr);
            alert(result.message);
            setSendTestModal(null);
            setTestEmailAddr('');
        } catch (err) { alert(err.message); }
        finally { setSendingTest(false); }
    };

    const isMailgun = form.providerType === 'mailgun';

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Sender Emails</h1>
                        <p className={styles.subtitle}>Manage SMTP and Mailgun accounts for sending campaigns</p>
                    </div>
                    <Button onClick={openAdd}><MdAdd /> Add Sender</Button>
                </div>

                <div className={styles.infoBox}>
                    <h4>💡 Sending Tips</h4>
                    <p>
                        <b>SMTP</b>: Use Gmail, Outlook, Zoho, or any custom SMTP server. Free-tier cloud hosts (Render, Railway) may block SMTP ports.{' '}
                        <b>Mailgun</b>: Recommended for cloud deployments — bypasses SMTP port restrictions and delivers reliably. Credentials are <b>encrypted at rest</b>.
                    </p>
                </div>

                {loading ? (
                    <Card><div className={styles.loading}>Loading senders...</div></Card>
                ) : senders.length === 0 ? (
                    <Card>
                        <div className={styles.empty}>
                            <MdEmail className={styles.emptyIcon} />
                            <h3>No sender accounts yet</h3>
                            <p>Add an SMTP or Mailgun account to start sending campaigns</p>
                            <Button onClick={openAdd}><MdAdd /> Add First Sender</Button>
                        </div>
                    </Card>
                ) : (
                    <div className={styles.grid}>
                        {senders.map(sender => {
                            const isMG = sender.providerType === 'mailgun';
                            return (
                                <div key={sender.id} className={styles.senderCard}>
                                    <div className={styles.senderHeader}>
                                        <div className={styles.senderIcon}
                                            style={{ background: sender.isVerified ? 'var(--color-accent)' : 'var(--color-gray-400)' }}>
                                            {isMG ? <SiMailgun style={{ fontSize: '1.1rem' }} /> : <MdEmail />}
                                        </div>
                                        <div className={styles.senderInfo}>
                                            <h3>{sender.name}</h3>
                                            <p>{sender.email}</p>
                                        </div>
                                        <div className={`${styles.badge} ${sender.isVerified ? styles.verified : styles.unverified}`}>
                                            {sender.isVerified ? <><MdCheck /> Verified</> : <><MdClose /> Unverified</>}
                                        </div>
                                    </div>

                                    <div className={styles.senderDetails}>
                                        {isMG ? (
                                            <>
                                                <span
                                                    style={{
                                                        background: 'rgba(246,60,15,0.1)',
                                                        color: '#f63c0f',
                                                        borderRadius: 4,
                                                        padding: '2px 8px',
                                                        fontWeight: 700,
                                                        fontSize: '0.8rem',
                                                    }}
                                                >
                                                    Mailgun API
                                                </span>
                                                <span>{sender.mailgunDomain}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>SMTP: {sender.smtpHost}:{sender.smtpPort}</span>
                                                <span>{sender.encryption}</span>
                                            </>
                                        )}
                                        <span>{sender._count?.campaigns || 0} campaigns</span>
                                    </div>

                                    {testResult?.id === sender.id && (
                                        <div className={`${styles.testResult} ${testResult.success ? styles.testSuccess : styles.testFail}`}>
                                            {testResult.message}
                                        </div>
                                    )}

                                    <div className={styles.senderActions}>
                                        <button onClick={() => handleTest(sender.id)} disabled={testing === sender.id}
                                            className={styles.actionBtn} title="Test Connection">
                                            <MdPlayArrow /> {testing === sender.id ? 'Testing...' : 'Test'}
                                        </button>
                                        <button onClick={() => { setSendTestModal(sender.id); setTestEmailAddr(sender.email); }}
                                            className={styles.actionBtn} title="Send Test Email">
                                            <MdSend /> Send Test
                                        </button>
                                        <button onClick={() => handleEdit(sender)} className={styles.actionBtn} title="Edit">
                                            <MdEdit /> Edit
                                        </button>
                                        <button onClick={() => handleDelete(sender.id)}
                                            className={`${styles.actionBtn} ${styles.deleteBtn}`} title="Delete">
                                            <MdDelete />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Add / Edit Modal ──────────────────────────────────────── */}
                {showModal && (
                    <div className={styles.modal} onClick={() => setShowModal(false)}>
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <h2>{editing ? 'Edit Sender' : 'Add Sender Account'}</h2>
                            <form onSubmit={handleSubmit} className={styles.modalForm}>

                                {/* Provider Type Toggle */}
                                <div className={styles.providerToggle}>
                                    <button
                                        type="button"
                                        className={`${styles.providerBtn} ${!isMailgun ? styles.providerBtnActive : ''}`}
                                        onClick={() => setForm(prev => ({ ...prev, providerType: 'smtp' }))}
                                    >
                                        <MdEmail /> SMTP
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.providerBtn} ${isMailgun ? styles.providerBtnActive : ''}`}
                                        onClick={() => setForm(prev => ({ ...prev, providerType: 'mailgun' }))}
                                    >
                                        <SiMailgun /> Mailgun API
                                    </button>
                                </div>

                                {/* Common Fields */}
                                <div className={styles.formRow}>
                                    <Input label="Sender Name" value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        required placeholder="Marketing Team" />
                                    <Input label="Sender Email" type="email" value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        required placeholder="marketing@company.com" />
                                </div>

                                {/* ── Mailgun Fields ── */}
                                {isMailgun ? (
                                    <>
                                        <div className={styles.mailgunNote}>
                                            🚀 Mailgun API bypasses SMTP port restrictions — ideal for cloud deployments.
                                        </div>
                                        <Input
                                            label="Mailgun API Key"
                                            type="password"
                                            value={form.mailgunApiKey}
                                            onChange={e => setForm({ ...form, mailgunApiKey: e.target.value })}
                                            required={!editing}
                                            placeholder={editing ? '(Leave blank to keep unchanged)' : 'key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                                            autoComplete="new-password"
                                        />
                                        <Input
                                            label="Mailgun Sending Domain"
                                            value={form.mailgunDomain}
                                            onChange={e => setForm({ ...form, mailgunDomain: e.target.value })}
                                            required
                                            placeholder="mg.yourdomain.com"
                                        />
                                    </>
                                ) : (
                                    /* ── SMTP Fields (original, unchanged) ── */
                                    <>
                                        <div className={styles.formRow}>
                                            <div className={styles.selectGroup}>
                                                <label>Email Provider</label>
                                                <select value={smtpPreset} onChange={e => handleSmtpPresetChange(e.target.value)}>
                                                    <option value="custom">Custom SMTP</option>
                                                    <option value="gmail">Google / Gmail</option>
                                                    <option value="outlook">Outlook / Office 365</option>
                                                    <option value="zoho">Zoho Mail</option>
                                                    <option value="icloud">iCloud Mail</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className={styles.formRow}>
                                            <Input label="SMTP Username" value={form.smtpUsername}
                                                onChange={e => setForm({ ...form, smtpUsername: e.target.value })}
                                                required placeholder="user@gmail.com" autoComplete="new-password" />
                                            <Input label="SMTP Password" type="password" toggleVisibility
                                                value={form.smtpPassword}
                                                onChange={e => setForm({ ...form, smtpPassword: e.target.value })}
                                                required={!editing}
                                                placeholder={editing ? '(Leave blank to keep unchanged)' : 'App password'}
                                                autoComplete="new-password" />
                                        </div>
                                        <div className={styles.advancedToggle} onClick={() => setShowAdvanced(!showAdvanced)}>
                                            {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings (Host, Port, Encryption)'}
                                        </div>
                                        {showAdvanced && (
                                            <>
                                                <div className={styles.formRow}>
                                                    <Input label="SMTP Host" value={form.smtpHost}
                                                        onChange={e => setForm({ ...form, smtpHost: e.target.value })}
                                                        required placeholder="smtp.gmail.com" />
                                                    <Input label="SMTP Port" type="number" value={form.smtpPort}
                                                        onChange={e => setForm({ ...form, smtpPort: parseInt(e.target.value) })}
                                                        required />
                                                </div>
                                                <div className={styles.formRow}>
                                                    <div className={styles.selectGroup}>
                                                        <label>Encryption</label>
                                                        <select value={form.encryption}
                                                            onChange={e => setForm({ ...form, encryption: e.target.value })}>
                                                            <option value="TLS">TLS (587)</option>
                                                            <option value="SSL">SSL (465)</option>
                                                            <option value="NONE">None</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                <div className={styles.modalActions}>
                                    <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                                    <Button type="submit">{editing ? 'Update' : 'Add Sender'}</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── Send Test Email Modal ─────────────────────────────────── */}
                {sendTestModal && (
                    <div className={styles.modal} onClick={() => setSendTestModal(null)}>
                        <div className={styles.modalContent} style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                            <h2>Send Test Email</h2>
                            <p style={{ color: 'var(--color-gray-500)', marginBottom: 16 }}>
                                Send a test email through this sender to verify it's working.
                            </p>
                            <Input label="Recipient Email" type="email" value={testEmailAddr}
                                onChange={e => setTestEmailAddr(e.target.value)} placeholder="you@example.com" />
                            <div className={styles.modalActions}>
                                <Button variant="ghost" type="button" onClick={() => setSendTestModal(null)}>Cancel</Button>
                                <Button onClick={handleSendTestEmail} loading={sendingTest} disabled={!testEmailAddr}>
                                    <MdSend /> Send
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

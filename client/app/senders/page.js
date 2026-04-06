'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import api from '../../lib/api';
import styles from './senders.module.css';
import { MdAdd, MdEmail, MdCheck, MdClose, MdPlayArrow, MdDelete, MdEdit } from 'react-icons/md';

export default function SendersPage() {
    const [senders, setSenders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [testing, setTesting] = useState(null);
    const [testResult, setTestResult] = useState(null);
    const [form, setForm] = useState({
        name: '', email: '', smtpHost: '', smtpPort: 587,
        smtpUsername: '', smtpPassword: '', encryption: 'TLS',
    });

    useEffect(() => { loadSenders(); }, []);

    const loadSenders = async () => {
        try {
            const data = await api.getSenders();
            setSenders(data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.updateSender(editing, form);
            } else {
                await api.createSender(form);
            }
            setShowModal(false); setEditing(null);
            setForm({ name: '', email: '', smtpHost: '', smtpPort: 587, smtpUsername: '', smtpPassword: '', encryption: 'TLS' });
            loadSenders();
        } catch (err) { alert(err.message); }
    };

    const handleEdit = (sender) => {
        setForm({
            name: sender.name, email: sender.email, smtpHost: sender.smtpHost,
            smtpPort: sender.smtpPort, smtpUsername: sender.smtpUsername || '',
            smtpPassword: '', encryption: sender.encryption,
        });
        setEditing(sender.id);
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

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Sender Emails</h1>
                        <p className={styles.subtitle}>Manage SMTP accounts for sending campaigns</p>
                    </div>
                    <Button onClick={() => { setEditing(null); setForm({ name:'',email:'',smtpHost:'',smtpPort:587,smtpUsername:'',smtpPassword:'',encryption:'TLS' }); setShowModal(true); }}>
                        <MdAdd /> Add Sender
                    </Button>
                </div>

                <div className={styles.infoBox}>
                    <h4>💡 Using Render or other Cloud Hosts?</h4>
                    <p>
                        Many hosting providers (like Render Free Tier) block SMTP ports (25, 465, 587). 
                        If your SMTP test fails with a <b>Connection Timeout</b>, please use an Email API like <b>Resend</b> by setting the <code>RESEND_API_KEY</code> environment variable.
                    </p>
                </div>

                {loading ? (
                    <Card><div className={styles.loading}>Loading senders...</div></Card>
                ) : senders.length === 0 ? (
                    <Card>
                        <div className={styles.empty}>
                            <MdEmail className={styles.emptyIcon} />
                            <h3>No sender accounts yet</h3>
                            <p>Add an SMTP account to start sending campaigns</p>
                            <Button onClick={() => setShowModal(true)}><MdAdd /> Add First Sender</Button>
                        </div>
                    </Card>
                ) : (
                    <div className={styles.grid}>
                        {senders.map(sender => (
                            <div key={sender.id} className={styles.senderCard}>
                                <div className={styles.senderHeader}>
                                    <div className={styles.senderIcon} style={{ background: sender.isVerified ? 'var(--color-accent)' : 'var(--color-gray-400)' }}>
                                        <MdEmail />
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
                                    <span>SMTP: {sender.smtpHost}:{sender.smtpPort}</span>
                                    <span>{sender.encryption}</span>
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
                                    <button onClick={() => handleEdit(sender)} className={styles.actionBtn} title="Edit">
                                        <MdEdit /> Edit
                                    </button>
                                    <button onClick={() => handleDelete(sender.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`} title="Delete">
                                        <MdDelete />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add/Edit Modal */}
                {showModal && (
                    <div className={styles.modal} onClick={() => setShowModal(false)}>
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <h2>{editing ? 'Edit Sender' : 'Add Sender Account'}</h2>
                            <form onSubmit={handleSubmit} className={styles.modalForm}>
                                <div className={styles.formRow}>
                                    <Input label="Sender Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Marketing Team" />
                                    <Input label="Sender Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required placeholder="marketing@company.com" />
                                </div>
                                <div className={styles.formRow}>
                                    <Input label="SMTP Host" value={form.smtpHost} onChange={e => setForm({...form, smtpHost: e.target.value})} required placeholder="smtp.gmail.com" />
                                    <Input label="SMTP Port" type="number" value={form.smtpPort} onChange={e => setForm({...form, smtpPort: parseInt(e.target.value)})} required />
                                </div>
                                <div className={styles.formRow}>
                                    <Input label="SMTP Username" value={form.smtpUsername} onChange={e => setForm({...form, smtpUsername: e.target.value})} required placeholder="user@gmail.com" />
                                    <Input label="SMTP Password" type="password" toggleVisibility value={form.smtpPassword} onChange={e => setForm({...form, smtpPassword: e.target.value})} required={!editing} placeholder={editing ? '(unchanged)' : 'App password'} />
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.selectGroup}>
                                        <label>Encryption</label>
                                        <select value={form.encryption} onChange={e => setForm({...form, encryption: e.target.value})}>
                                            <option value="TLS">TLS</option>
                                            <option value="SSL">SSL</option>
                                            <option value="NONE">None</option>
                                        </select>
                                    </div>
                                </div>
                                <div className={styles.modalActions}>
                                    <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                                    <Button type="submit">{editing ? 'Update' : 'Add Sender'}</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

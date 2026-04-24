'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import api from '../../../lib/api';
import styles from './sms.module.css';
import { MdAdd, MdSms, MdEdit, MdDelete, MdContentCopy } from 'react-icons/md';
import ConfirmModal from '../../../components/ConfirmModal';

function SmsTemplatesContent() {
    const router = useRouter();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', content: '' });
    const [confirmState, setConfirmState] = useState({ isOpen: false, payload: null });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await api.getSmsTemplates();
            setTemplates(data || []);
        } catch (error) {
            console.error('Failed to load SMS templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.updateSmsTemplate(editing, form);
            } else {
                await api.createSmsTemplate(form);
            }
            setShowModal(false);
            setEditing(null);
            setForm({ name: '', content: '' });
            loadTemplates();
        } catch (error) {
            alert('Failed to save template: ' + error.message);
        }
    };

    const handleEdit = (template) => {
        setForm({ name: template.name, content: template.content });
        setEditing(template.id);
        setShowModal(true);
    };

    const confirmDelete = (id) => {
        setConfirmState({ isOpen: true, payload: id });
    };

    const handleConfirmDelete = async () => {
        const id = confirmState.payload;
        setConfirmState({ isOpen: false, payload: null });
        try {
            await api.deleteSmsTemplate(id);
            loadTemplates();
        } catch (error) {
            alert('Failed to delete template: ' + error.message);
        }
    };

    const handleDuplicate = async (template) => {
        try {
            await api.createSmsTemplate({
                name: `${template.name} (Copy)`,
                content: template.content,
            });
            loadTemplates();
        } catch (error) {
            alert('Failed to duplicate template: ' + error.message);
        }
    };

    const charCount = form.content.length;
    const segmentCount = Math.ceil(charCount / 160) || 0;

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>SMS Templates</h1>
                        <p className={styles.subtitle}>Create and manage your SMS message templates</p>
                    </div>
                    <Button onClick={() => { setEditing(null); setForm({ name: '', content: '' }); setShowModal(true); }}>
                        <MdAdd /> Create Template
                    </Button>
                </div>

                {loading ? (
                    <div className={styles.loading}>Loading templates...</div>
                ) : templates.length === 0 ? (
                    <Card>
                        <div className={styles.empty}>
                            <MdSms className={styles.emptyIcon} />
                            <h3>No SMS templates yet</h3>
                            <p>Create a template to reuse in your SMS campaigns</p>
                            <Button onClick={() => setShowModal(true)}>
                                <MdAdd /> Create First Template
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <div className={styles.grid}>
                        {templates.map((template) => (
                            <div key={template.id} className={styles.templateCard}>
                                <div className={styles.templateHeader}>
                                    <MdSms className={styles.templateIcon} />
                                    <h3 className={styles.templateName}>{template.name}</h3>
                                </div>
                                <p className={styles.templateContent}>{template.content}</p>
                                <div className={styles.templateMeta}>
                                    <span>{template.content.length} chars</span>
                                    <span>{Math.ceil(template.content.length / 160)} segment{Math.ceil(template.content.length / 160) !== 1 ? 's' : ''}</span>
                                    <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className={styles.templateActions}>
                                    <button onClick={() => handleEdit(template)} className={styles.actionBtn} title="Edit">
                                        <MdEdit /> Edit
                                    </button>
                                    <button onClick={() => handleDuplicate(template)} className={styles.actionBtn} title="Duplicate">
                                        <MdContentCopy /> Copy
                                    </button>
                                    <button onClick={() => confirmDelete(template.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`} title="Delete">
                                        <MdDelete />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create/Edit Modal */}
                {showModal && (
                    <div className={styles.modal} onClick={() => setShowModal(false)}>
                        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <h2>{editing ? 'Edit SMS Template' : 'Create SMS Template'}</h2>
                            <form onSubmit={handleSubmit} className={styles.modalForm}>
                                <Input
                                    label="Template Name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                    placeholder="Welcome Message"
                                />
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Message Content</label>
                                    <textarea
                                        value={form.content}
                                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                                        className={styles.textarea}
                                        rows={6}
                                        required
                                        placeholder="Hi {{first_name}}, thanks for signing up!"
                                    />
                                    <div className={styles.charInfo}>
                                        <span>{charCount} / 160 characters</span>
                                        <span>{segmentCount} segment{segmentCount !== 1 ? 's' : ''}</span>
                                    </div>
                                    <p className={styles.hint}>
                                        Merge tags: {'{{first_name}}'}, {'{{last_name}}'}, {'{{email}}'}, {'{{phone}}'}
                                    </p>
                                </div>
                                <div className={styles.modalActions}>
                                    <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                                    <Button type="submit">{editing ? 'Update' : 'Create Template'}</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ConfirmModal 
                    isOpen={confirmState.isOpen}
                    title="Delete SMS Template"
                    message="Are you sure you want to delete this SMS template? This cannot be undone."
                    confirmText="Delete"
                    variant="danger"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setConfirmState({ isOpen: false, payload: null })}
                />
            </div>
        </DashboardLayout>
    );
}

export default function SmsTemplatesPage() {
    return (
        <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
            <SmsTemplatesContent />
        </Suspense>
    );
}

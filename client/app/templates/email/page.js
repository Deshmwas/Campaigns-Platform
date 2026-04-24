'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import api from '../../../lib/api';
import styles from './templates.module.css';
import { MdAdd, MdEdit, MdDelete, MdContentCopy, MdEmail, MdCheckCircle, MdError, MdClose } from 'react-icons/md';
import ConfirmModal from '../../../components/ConfirmModal';

function Toast({ message, type, onDismiss }) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 5000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const isError = type === 'error';
    return (
        <div style={{
            position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
            background: isError ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${isError ? '#fecaca' : '#bbf7d0'}`,
            color: isError ? '#dc2626' : '#16a34a',
            padding: '12px 16px', borderRadius: '10px', minWidth: '280px',
            fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            animation: 'slideIn 0.25s ease-out',
        }}>
            {isError ? <MdError size={20} /> : <MdCheckCircle size={20} />}
            <span style={{ flex: 1 }}>{message}</span>
            <button onClick={onDismiss} style={{
                background: 'none', border: 'none', color: 'inherit', cursor: 'pointer',
                padding: '2px', display: 'flex', opacity: 0.6,
            }}><MdClose size={16} /></button>
        </div>
    );
}

function EmailTemplatesContent() {
    const router = useRouter();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmState, setConfirmState] = useState({ isOpen: false, payload: null });
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type, id: Date.now() });
    }, []);

    useEffect(() => { loadTemplates(); }, []);

    const loadTemplates = async () => {
        try {
            const data = await api.getEmailTemplates();
            setTemplates(data || []);
        } catch (error) {
            console.error('Failed to load templates:', error);
            showToast('Failed to load templates. Please refresh the page.', 'error');
        }
        finally { setLoading(false); }
    };

    const confirmDelete = (id) => {
        setConfirmState({ isOpen: true, payload: id });
    };

    const handleConfirmDelete = async () => {
        const id = confirmState.payload;
        setConfirmState({ isOpen: false, payload: null });
        try { 
            await api.deleteEmailTemplate(id); 
            showToast('Template deleted successfully.');
            loadTemplates(); 
        } catch (err) {
            showToast(err.message || 'Failed to delete template.', 'error');
        }
    };

    const handleDuplicate = async (id) => {
        try {
            await api.duplicateEmailTemplate(id);
            showToast('Template duplicated successfully.');
            loadTemplates();
        } catch (err) {
            showToast(err.message || 'Failed to duplicate template.', 'error');
        }
    };

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Email Templates</h1>
                        <p className={styles.subtitle}>Manage your reusable email designs</p>
                    </div>
                    <Button onClick={() => router.push('/templates/builder')}>
                        <MdAdd /> Create Template
                    </Button>
                </div>

                <Card>
                    {loading ? (
                        <div className={styles.loading}>Loading templates...</div>
                    ) : templates.length === 0 ? (
                        <div className={styles.empty}>
                            <MdEmail className={styles.emptyIcon} />
                            <p>No templates yet</p>
                            <Button onClick={() => router.push('/templates/builder')}>Design your first template</Button>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {templates.map((template) => (
                                <div key={template.id} className={styles.card}>
                                    <div className={styles.thumbnail}>
                                        {template.htmlContent ? (
                                            <div className={styles.previewContainer}>
                                                <iframe
                                                    srcDoc={template.htmlContent}
                                                    title={template.name}
                                                    className={styles.previewIframe}
                                                    sandbox="allow-popups-to-escape-sandbox"
                                                />
                                            </div>
                                        ) : (
                                            <div className={styles.thumbnailPlaceholder}>
                                                <MdEmail />
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.info}>
                                        <h3 className={styles.name}>{template.name}</h3>
                                        <p className={styles.subject}>{template.subject || 'No Subject'}</p>
                                        <p className={styles.date}>Created {new Date(template.createdAt).toLocaleDateString()}</p>
                                        
                                        <div className={styles.actions}>
                                            <Button variant="ghost" size="sm" onClick={() => router.push(`/templates/builder?id=${template.id}`)}>
                                                <MdEdit /> Edit
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDuplicate(template.id)}>
                                                <MdContentCopy /> Duplicate
                                            </Button>
                                            <button 
                                                className={styles.deleteBtn} 
                                                onClick={() => confirmDelete(template.id)}
                                                title="Delete"
                                            >
                                                <MdDelete />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <ConfirmModal 
                    isOpen={confirmState.isOpen}
                    title="Delete Template"
                    message="Are you sure you want to delete this template? This cannot be undone."
                    confirmText="Delete"
                    variant="danger"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setConfirmState({ isOpen: false, payload: null })}
                />

                {toast && (
                    <Toast 
                        key={toast.id}
                        message={toast.message} 
                        type={toast.type} 
                        onDismiss={() => setToast(null)} 
                    />
                )}
            </div>
        </DashboardLayout>
    );
}

export default function EmailTemplatesPage() {
    return (
        <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
            <EmailTemplatesContent />
        </Suspense>
    );
}

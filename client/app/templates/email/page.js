'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import api from '../../../lib/api';
import styles from './templates.module.css';
import { MdAdd, MdEdit, MdDelete, MdContentCopy, MdEmail } from 'react-icons/md';
import ConfirmModal from '../../../components/ConfirmModal';

export default function EmailTemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmState, setConfirmState] = useState({ isOpen: false, payload: null });

    useEffect(() => { loadTemplates(); }, []);

    const loadTemplates = async () => {
        try {
            const data = await api.getEmailTemplates();
            setTemplates(data || []);
        } catch (error) { console.error('Failed to load templates:', error); }
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
            loadTemplates(); 
        } catch (err) { alert(err.message); }
    };

    const handleDuplicate = async (id) => {
        try {
            await api.duplicateEmailTemplate(id);
            loadTemplates();
        } catch (err) { alert(err.message); }
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
                                        {/* A simple representation since we don't have images */}
                                        <div className={styles.thumbnailPlaceholder}>
                                            <MdEmail />
                                        </div>
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
            </div>
        </DashboardLayout>
    );
}

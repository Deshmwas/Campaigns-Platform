'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ConfirmModal from '../../components/ConfirmModal';
import api from '../../lib/api';
import styles from './contacts.module.css';
import { MdAdd, MdUpload, MdDelete, MdEdit } from 'react-icons/md';

export default function ContactsPage() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        try {
            const data = await api.getContacts({ limit: 100 });
            setContacts(data.contacts || []);
        } catch (error) {
            console.error('Failed to load contacts:', error);
            setErrorMessage('Failed to load contacts.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddContact = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            email: formData.get('email'),
            phone: formData.get('phone'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
        };

        setActionLoading(true);
        try {
            setErrorMessage('');
            let saved;
            if (editingContact) {
                saved = await api.updateContact(editingContact.id, data);
                setContacts(prev => prev.map(c => c.id === editingContact.id ? saved : c));
                setSuccessMessage('Contact updated successfully.');
            } else {
                saved = await api.createContact(data);
                setContacts(prev => [saved, ...prev]);
                setSuccessMessage('Contact added successfully.');
            }
            setShowAddModal(false);
            setEditingContact(null);
            e.target.reset();
        } catch (error) {
            setSuccessMessage('');
            setErrorMessage('Failed to save contact: ' + error.message);
        } finally {
            setActionLoading(false);
            setLoading(false);
        }
    };

    const handleImport = async (e) => {
        e.preventDefault();
        const csvData = e.target.csvData.value;

        try {
            setErrorMessage('');
            const result = await api.importContacts(csvData, null);
            setSuccessMessage(`Imported ${result.imported} contacts. ${result.failed} failed.`);
            setShowImportModal(false);
            loadContacts();
        } catch (error) {
            setSuccessMessage('');
            setErrorMessage('Import failed: ' + error.message);
        }
    };

    const openEdit = (contact) => {
        setErrorMessage('');
        setEditingContact(contact);
        setShowAddModal(true);
    };

    const askDelete = (contact) => {
        setSelectedContact(contact);
        setConfirmDelete(true);
    };

    const handleDeleteContact = async () => {
        if (!selectedContact) return;
        setActionLoading(true);
        try {
            await api.deleteContact(selectedContact.id);
            setContacts(prev => prev.filter(c => c.id !== selectedContact.id));
            setConfirmDelete(false);
            setSelectedContact(null);
            setErrorMessage('');
            setSuccessMessage('Contact deleted successfully.');
        } catch (error) {
            setSuccessMessage('');
            setErrorMessage('Failed to delete contact: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Contacts</h1>
                        <p className={styles.subtitle}>Manage your contact database</p>
                    </div>
                    <div className={styles.actions}>
                        <Button variant="outline" onClick={() => setShowImportModal(true)}>
                            <MdUpload /> Import CSV
                        </Button>
                        <Button onClick={() => setShowAddModal(true)}>
                            <MdAdd /> Add Contact
                        </Button>
                    </div>
                </div>
                {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
                {successMessage && <div className={styles.successBanner}>{successMessage}</div>}

                <Card>
                    {loading ? (
                        <div className={styles.loading}>Loading contacts...</div>
                    ) : contacts.length === 0 ? (
                        <div className={styles.empty}>
                            <p>No contacts yet</p>
                            <Button onClick={() => setShowAddModal(true)}>Add your first contact</Button>
                        </div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Status</th>
                                        <th className={styles.actionsCol}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contacts.map((contact) => (
                                        <tr key={contact.id}>
                                            <td data-label="Name">
                                                {contact.firstName} {contact.lastName}
                                            </td>
                                            <td data-label="Email">{contact.email || '-'}</td>
                                            <td data-label="Phone">{contact.phone || '-'}</td>
                                            <td data-label="Status">
                                                <span className={`${styles.badge} ${styles[contact.status.toLowerCase()]}`}>
                                                    {contact.status}
                                                </span>
                                            </td>
                                            <td data-label="Actions" className={styles.actionsCell}>
                                                <button className={styles.iconButton} onClick={() => openEdit(contact)} title="Edit contact">
                                                    <MdEdit size={16} />
                                                </button>
                                                <button className={`${styles.iconButton} ${styles.danger}`} onClick={() => askDelete(contact)} title="Delete contact">
                                                    <MdDelete size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {showAddModal && (
                    <div className={styles.modal} onClick={() => { setShowAddModal(false); setEditingContact(null); }}>
                        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <h2 className={styles.modalTitle}>{editingContact ? 'Edit Contact' : 'Add Contact'}</h2>
                            <form onSubmit={handleAddContact}>
                                <Input label="First Name" name="firstName" required defaultValue={editingContact?.firstName || ''} />
                                <Input label="Last Name" name="lastName" required defaultValue={editingContact?.lastName || ''} />
                                <Input label="Email" name="email" type="email" defaultValue={editingContact?.email || ''} />
                                <Input label="Phone" name="phone" type="tel" defaultValue={editingContact?.phone || ''} />
                                <div className={styles.modalActions}>
                                    <Button type="button" variant="ghost" onClick={() => { setShowAddModal(false); setEditingContact(null); }}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" loading={actionLoading}>{editingContact ? 'Update' : 'Add Contact'}</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showImportModal && (
                    <div className={styles.modal} onClick={() => setShowImportModal(false)}>
                        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <h2 className={styles.modalTitle}>Import Contacts (CSV)</h2>
                            <form onSubmit={handleImport}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Paste CSV Data</label>
                                    <textarea
                                        name="csvData"
                                        className={styles.textarea}
                                        rows={10}
                                        placeholder="email,firstName,lastName,phone&#10;john@example.com,John,Doe,+1234567890"
                                        required
                                    />
                                    <p className={styles.hint}>
                                        Expected columns: email, firstName (or first_name), lastName (or last_name), phone
                                    </p>
                                </div>
                                <div className={styles.modalActions}>
                                    <Button type="button" variant="ghost" onClick={() => setShowImportModal(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit">Import</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    isOpen={confirmDelete}
                    title="Delete contact?"
                    message={selectedContact ? `Remove ${selectedContact.firstName || ''} ${selectedContact.lastName || ''} from your contacts. This cannot be undone.` : ''}
                    confirmText="Delete"
                    variant="danger"
                    onConfirm={handleDeleteContact}
                    onCancel={() => { setConfirmDelete(false); setSelectedContact(null); }}
                />
            </div>
        </DashboardLayout>
    );
}

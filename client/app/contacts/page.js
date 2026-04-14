'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ConfirmModal from '../../components/ConfirmModal';
import api from '../../lib/api';
import styles from './contacts.module.css';
import { MdAdd, MdUpload, MdDelete, MdEdit, MdChevronLeft, MdChevronRight, MdPlaylistAdd } from 'react-icons/md';

export default function ContactsPage() {
    const router = useRouter();
    const [contacts, setContacts] = useState([]);
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    // Selection state
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulkAddModal, setShowBulkAddModal] = useState(false);
    const [targetListId, setTargetListId] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 50 });

    useEffect(() => {
        loadContacts(currentPage);
        loadLists();
    }, [currentPage]);

    const loadContacts = async (page = 1) => {
        setLoading(true);
        try {
            const data = await api.getContacts({ page, limit: 50 });
            setContacts(data.contacts || []);
            if (data.pagination) {
                setPagination(data.pagination);
            }
            setSelectedIds([]); // Reset selection on page change
        } catch (error) {
            console.error('Failed to load contacts:', error);
            setErrorMessage('Failed to load contacts.');
        } finally {
            setLoading(false);
        }
    };

    const loadLists = async () => {
        try {
            const data = await api.getLists();
            setLists(data || []);
        } catch (err) {}
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
                loadContacts(currentPage);
            }
            setShowAddModal(false);
            setEditingContact(null);
        } catch (error) {
            setErrorMessage('Failed to save contact: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteContact = async () => {
        if (!selectedContact) return;
        setActionLoading(true);
        try {
            await api.deleteContact(selectedContact.id);
            setContacts(prev => prev.filter(c => c.id !== selectedContact.id));
            setConfirmDelete(false);
            setSelectedContact(null);
            setSuccessMessage('Contact deleted successfully.');
            if (contacts.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            } else {
                loadContacts(currentPage);
            }
        } catch (error) {
            setErrorMessage('Failed to delete contact: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === contacts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(contacts.map(c => c.id));
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBulkAddToList = async () => {
        if (!targetListId || selectedIds.length === 0) return;
        setActionLoading(true);
        try {
            await api.addContactsToList(targetListId, selectedIds);
            setSuccessMessage(`Added ${selectedIds.length} contacts to list successfully.`);
            setShowBulkAddModal(false);
            setSelectedIds([]);
            setTargetListId('');
        } catch (error) {
            setErrorMessage('Failed to add contacts to list: ' + error.message);
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
                        <Button variant="outline" onClick={() => router.push('/contacts/import')}>
                            <MdUpload /> Import Contacts
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
                            <p>No contacts found</p>
                            <Button onClick={() => setShowAddModal(true)}>Add your first contact</Button>
                        </div>
                    ) : (
                        <>
                            {selectedIds.length > 0 && (
                                <div className={styles.bulkActions}>
                                    <span className={styles.selectionCount}>{selectedIds.length} contacts selected</span>
                                    <Button size="small" variant="outline" onClick={() => setShowBulkAddModal(true)}>
                                        <MdPlaylistAdd /> Add to List
                                    </Button>
                                    <Button size="small" variant="ghost" onClick={() => setSelectedIds([])}>Cancel</Button>
                                </div>
                            )}

                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th className={styles.checkCol}>
                                                <input 
                                                    type="checkbox" 
                                                    className={styles.checkbox}
                                                    checked={selectedIds.length === contacts.length && contacts.length > 0}
                                                    onChange={toggleSelectAll}
                                                />
                                            </th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Phone</th>
                                            <th>Status</th>
                                            <th className={styles.actionsCol}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contacts.map((contact) => (
                                            <tr key={contact.id} className={selectedIds.includes(contact.id) ? styles.selectedRow : ''}>
                                                <td className={styles.checkCol}>
                                                    <input 
                                                        type="checkbox" 
                                                        className={styles.checkbox}
                                                        checked={selectedIds.includes(contact.id)}
                                                        onChange={() => toggleSelect(contact.id)}
                                                    />
                                                </td>
                                                <td data-label="Name" onClick={() => toggleSelect(contact.id)} style={{cursor:'pointer'}}>
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
                                                    <button className={styles.iconButton} onClick={() => { setEditingContact(contact); setShowAddModal(true); }} title="Edit contact">
                                                        <MdEdit size={16} />
                                                    </button>
                                                    <button className={`${styles.iconButton} ${styles.danger}`} onClick={() => { setSelectedContact(contact); setConfirmDelete(true); }} title="Delete contact">
                                                        <MdDelete size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {pagination.pages > 1 && (
                                <div className={styles.pagination}>
                                    <span className={styles.pageInfo}>
                                        Page <strong>{currentPage}</strong> of <strong>{pagination.pages}</strong> ({pagination.total} results)
                                    </span>
                                    <div className={styles.pageButtons}>
                                        <button 
                                            disabled={currentPage === 1} 
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className={styles.pageBtn}
                                        >
                                            <MdChevronLeft /> Prev
                                        </button>
                                        <button 
                                            disabled={currentPage === pagination.pages} 
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className={styles.pageBtn}
                                        >
                                            Next <MdChevronRight />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </Card>

                {/* Modals */}
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
                                    <Button type="button" variant="ghost" onClick={() => { setShowAddModal(false); setEditingContact(null); }}>Cancel</Button>
                                    <Button type="submit" loading={actionLoading}>{editingContact ? 'Update' : 'Add'}</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showBulkAddModal && (
                    <div className={styles.modal} onClick={() => setShowBulkAddModal(false)}>
                        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <h2 className={styles.modalTitle}>Add {selectedIds.length} contacts to List</h2>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Select Target List</label>
                                <select 
                                    className={styles.textarea} 
                                    style={{padding: '10px', height: 'auto', fontFamily: 'inherit'}}
                                    value={targetListId}
                                    onChange={e => setTargetListId(e.target.value)}
                                >
                                    <option value="">Choose a list...</option>
                                    {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div className={styles.modalActions}>
                                <Button type="button" variant="ghost" onClick={() => setShowBulkAddModal(false)}>Cancel</Button>
                                <Button onClick={handleBulkAddToList} disabled={!targetListId} loading={actionLoading}>Add Contacts</Button>
                            </div>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    isOpen={confirmDelete}
                    title="Delete contact?"
                    message={`This will permanently delete this contact. This action cannot be undone.`}
                    confirmText="Delete"
                    variant="danger"
                    onConfirm={handleDeleteContact}
                    onCancel={() => { setConfirmDelete(false); setSelectedContact(null); }}
                />
            </div>
        </DashboardLayout>
    );
}

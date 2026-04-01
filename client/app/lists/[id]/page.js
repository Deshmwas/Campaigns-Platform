'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import api from '../../../lib/api';
import styles from './listDetail.module.css';
import { MdAdd, MdFileUpload, MdPeople, MdDelete, MdEdit, MdArrowBack, MdSearch, MdClose } from 'react-icons/md';

export default function ListDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [list, setList] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [allContacts, setAllContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSelectModal, setShowSelectModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editContact, setEditContact] = useState(null);
    const [addForm, setAddForm] = useState({ firstName: '', lastName: '', email: '', phone: '', company: '' });

    const loadList = useCallback(async () => {
        try {
            const lists = await api.getLists();
            const found = (lists || []).find(l => l.id === id);
            setList(found || null);

            const result = await api.getContacts({ listId: id, limit: 200 });
            setContacts(result?.contacts || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { loadList(); }, [loadList]);

    const loadAllContacts = async () => {
        try {
            const result = await api.getContacts({ limit: 500 });
            setAllContacts(result?.contacts || []);
        } catch(e) { console.error(e); }
    };

    const handleAddContact = async (e) => {
        e.preventDefault();
        try {
            const contact = await api.createContact({
                ...addForm,
                customData: addForm.company ? { company: addForm.company } : undefined,
                listIds: [id],
            });
            setShowAddModal(false);
            setAddForm({ firstName: '', lastName: '', email: '', phone: '', company: '' });
            loadList();
        } catch (err) { alert(err.message); }
    };

    const handleRemoveContact = async (contactId) => {
        if (!confirm('Remove this contact from the list?')) return;
        try {
            await api.removeContactsFromList(id, [contactId]);
            loadList();
        } catch (err) { alert(err.message); }
    };

    const handleSelectExisting = async (contactIds) => {
        try {
            await api.addContactsToList(id, contactIds);
            setShowSelectModal(false);
            loadList();
        } catch (err) { alert(err.message); }
    };

    const filteredContacts = contacts.filter(c => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (c.firstName || '').toLowerCase().includes(s) ||
            (c.lastName || '').toLowerCase().includes(s) ||
            (c.email || '').toLowerCase().includes(s);
    });

    if (loading) return <DashboardLayout><div className={styles.loading}>Loading...</div></DashboardLayout>;
    if (!list) return <DashboardLayout><div className={styles.loading}>List not found</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.push('/lists')}>
                        <MdArrowBack /> Back to Lists
                    </button>
                    <div className={styles.listInfo}>
                        <h1 className={styles.title}>{list.name}</h1>
                        {list.description && <p className={styles.subtitle}>{list.description}</p>}
                        <span className={styles.count}><MdPeople /> {list._count?.memberships || contacts.length} contacts</span>
                    </div>
                    <div className={styles.actions}>
                        <Button variant="ghost" onClick={() => { setShowImportModal(true); }}>
                            <MdFileUpload /> Import CSV
                        </Button>
                        <Button variant="ghost" onClick={() => { loadAllContacts(); setShowSelectModal(true); }}>
                            <MdPeople /> Select Existing
                        </Button>
                        <Button onClick={() => setShowAddModal(true)}>
                            <MdAdd /> Add Contact
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className={styles.searchRow}>
                    <div className={styles.searchInput}>
                        <MdSearch />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." />
                    </div>
                </div>

                {/* Contacts Table */}
                <Card>
                    {filteredContacts.length === 0 ? (
                        <div className={styles.empty}>
                            <MdPeople className={styles.emptyIcon} />
                            <h3>No contacts in this list</h3>
                            <p>Add contacts manually, import a CSV, or select from existing contacts</p>
                        </div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>First Name</th>
                                        <th>Last Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Company</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredContacts.map(contact => (
                                        <tr key={contact.id}>
                                            <td>{contact.firstName || '-'}</td>
                                            <td>{contact.lastName || '-'}</td>
                                            <td>{contact.email || '-'}</td>
                                            <td>{contact.phone || '-'}</td>
                                            <td>{contact.customData?.company || '-'}</td>
                                            <td>
                                                <div className={styles.rowActions}>
                                                    <button onClick={() => { setEditContact(contact); setAddForm({
                                                        firstName: contact.firstName || '', lastName: contact.lastName || '',
                                                        email: contact.email || '', phone: contact.phone || '',
                                                        company: contact.customData?.company || '',
                                                    }); setShowAddModal(true); }} className={styles.iconBtn} title="Edit">
                                                        <MdEdit />
                                                    </button>
                                                    <button onClick={() => handleRemoveContact(contact.id)} className={`${styles.iconBtn} ${styles.deleteIcon}`} title="Remove">
                                                        <MdDelete />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {/* Add/Edit Contact Modal */}
                {showAddModal && (
                    <div className={styles.modal} onClick={() => { setShowAddModal(false); setEditContact(null); }}>
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <h2>{editContact ? 'Edit Contact' : 'Add Contact to List'}</h2>
                            <form onSubmit={editContact ? async (e) => {
                                e.preventDefault();
                                try {
                                    await api.updateContact(editContact.id, {
                                        ...addForm, customData: { company: addForm.company },
                                    });
                                    setShowAddModal(false); setEditContact(null);
                                    setAddForm({ firstName: '', lastName: '', email: '', phone: '', company: '' });
                                    loadList();
                                } catch (err) { alert(err.message); }
                            } : handleAddContact}>
                                <div className={styles.formGrid}>
                                    <Input label="First Name" value={addForm.firstName} onChange={e => setAddForm({...addForm, firstName: e.target.value})} placeholder="John" />
                                    <Input label="Last Name" value={addForm.lastName} onChange={e => setAddForm({...addForm, lastName: e.target.value})} placeholder="Doe" />
                                    <Input label="Email" type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} required placeholder="john@email.com" />
                                    <Input label="Phone" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} placeholder="+1234567890" />
                                    <Input label="Company" value={addForm.company} onChange={e => setAddForm({...addForm, company: e.target.value})} placeholder="Acme Inc." />
                                </div>
                                <div className={styles.modalActions}>
                                    <Button type="button" variant="ghost" onClick={() => { setShowAddModal(false); setEditContact(null); }}>Cancel</Button>
                                    <Button type="submit">{editContact ? 'Update' : 'Add Contact'}</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Select Existing Contacts Modal */}
                {showSelectModal && (
                    <SelectContactsModal
                        contacts={allContacts}
                        existingIds={contacts.map(c => c.id)}
                        onSelect={handleSelectExisting}
                        onClose={() => setShowSelectModal(false)}
                    />
                )}

                {/* Import CSV Modal */}
                {showImportModal && (
                    <div className={styles.modal} onClick={() => setShowImportModal(false)}>
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <h2>Import Contacts via CSV</h2>
                            <p style={{color: 'var(--color-gray-500)', marginBottom: '1rem'}}>
                                Upload a CSV file with columns: email, firstName, lastName, phone
                            </p>
                            <Button onClick={() => { setShowImportModal(false); router.push(`/contacts/import?listId=${id}`); }}>
                                Go to Import Page
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

function SelectContactsModal({ contacts, existingIds, onSelect, onClose }) {
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState('');

    const available = contacts.filter(c => !existingIds.includes(c.id));
    const filtered = available.filter(c => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (c.email || '').toLowerCase().includes(s) || (c.firstName || '').toLowerCase().includes(s);
    });

    return (
        <div className={styles.modal} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{maxWidth: 600}}>
                <h2>Select Existing Contacts</h2>
                <div className={styles.searchInput} style={{marginBottom: 16}}>
                    <MdSearch />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." />
                </div>
                <div style={{maxHeight: 300, overflowY: 'auto'}}>
                    {filtered.length === 0 ? (
                        <p style={{textAlign:'center',color:'var(--color-gray-500)',padding:20}}>No contacts available</p>
                    ) : filtered.map(c => (
                        <label key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 4px',borderBottom:'1px solid var(--color-gray-100)',cursor:'pointer'}}>
                            <input type="checkbox" checked={selected.includes(c.id)}
                                onChange={() => setSelected(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                                style={{accentColor:'var(--color-primary)'}} />
                            <span style={{fontWeight:500}}>{c.firstName} {c.lastName}</span>
                            <span style={{color:'var(--color-gray-500)',fontSize:'0.8rem',marginLeft:'auto'}}>{c.email}</span>
                        </label>
                    ))}
                </div>
                <div className={styles.modalActions}>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSelect(selected)} disabled={selected.length === 0}>
                        Add {selected.length} Contact{selected.length !== 1 ? 's' : ''}
                    </Button>
                </div>
            </div>
        </div>
    );
}

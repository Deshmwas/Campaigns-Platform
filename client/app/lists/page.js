'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import api from '../../lib/api';
import styles from '../contacts/contacts.module.css';
import { MdAdd, MdEdit, MdDelete, MdPeople } from 'react-icons/md';

export default function ListsPage() {
    const router = useRouter();
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingList, setEditingList] = useState(null);

    useEffect(() => { loadLists(); }, []);

    const loadLists = async () => {
        try {
            const data = await api.getLists();
            setLists(data || []);
        } catch (error) { console.error('Failed to load lists:', error); }
        finally { setLoading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = { name: formData.get('name'), description: formData.get('description') };
        try {
            if (editingList) {
                await api.updateList(editingList.id, data);
            } else {
                await api.createList(data);
            }
            setShowModal(false);
            setEditingList(null);
            loadLists();
            e.target.reset();
        } catch (error) { alert('Failed: ' + error.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this list and all its memberships?')) return;
        try { await api.deleteList(id); loadLists(); }
        catch (err) { alert(err.message); }
    };

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Contact Lists</h1>
                        <p className={styles.subtitle}>Organize your contacts into lists</p>
                    </div>
                    <Button onClick={() => { setEditingList(null); setShowModal(true); }}>
                        <MdAdd /> Create List
                    </Button>
                </div>

                <Card>
                    {loading ? (
                        <div className={styles.loading}>Loading lists...</div>
                    ) : lists.length === 0 ? (
                        <div className={styles.empty}>
                            <p>No lists yet</p>
                            <Button onClick={() => setShowModal(true)}>Create your first list</Button>
                        </div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Description</th>
                                        <th>Contacts</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lists.map((list) => (
                                        <tr key={list.id} style={{cursor:'pointer'}}
                                            onClick={() => router.push(`/lists/${list.id}`)}>
                                            <td style={{ fontWeight: 600 }}>
                                                <div style={{display:'flex',alignItems:'center',gap:8}}>
                                                    <MdPeople style={{color:'var(--color-primary)'}} />
                                                    {list.name}
                                                </div>
                                            </td>
                                            <td>{list.description || '-'}</td>
                                            <td>
                                                <span style={{
                                                    background:'var(--color-gray-100)',padding:'2px 10px',
                                                    borderRadius:'var(--radius-full)',fontWeight:600,fontSize:'0.85rem'
                                                }}>
                                                    {list._count?.memberships || 0}
                                                </span>
                                            </td>
                                            <td>{new Date(list.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <div style={{display:'flex',gap:4}} onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => { setEditingList(list); setShowModal(true); }}
                                                        style={{background:'none',border:'none',cursor:'pointer',padding:6,borderRadius:4,color:'var(--color-gray-500)'}}>
                                                        <MdEdit />
                                                    </button>
                                                    <button onClick={() => handleDelete(list.id)}
                                                        style={{background:'none',border:'none',cursor:'pointer',padding:6,borderRadius:4,color:'var(--color-gray-500)'}}>
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

                {showModal && (
                    <div className={styles.modal} onClick={() => { setShowModal(false); setEditingList(null); }}>
                        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <h2 className={styles.modalTitle}>{editingList ? 'Edit List' : 'Create List'}</h2>
                            <form onSubmit={handleCreate}>
                                <Input label="List Name" name="name" required placeholder="Newsletter Subscribers"
                                    defaultValue={editingList?.name || ''} />
                                <Input label="Description" name="description" placeholder="Monthly newsletter recipients"
                                    defaultValue={editingList?.description || ''} />
                                <div className={styles.modalActions}>
                                    <Button type="button" variant="ghost" onClick={() => { setShowModal(false); setEditingList(null); }}>Cancel</Button>
                                    <Button type="submit">{editingList ? 'Update' : 'Create List'}</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

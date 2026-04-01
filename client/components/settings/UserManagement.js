'use client';

import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Button from '../Button';
import Input from '../Input';
import ConfirmModal from '../ConfirmModal';
import { MdAdd, MdEdit, MdDelete, MdPerson, MdVpnKey } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';

export default function UserManagement() {
    const { user: authUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, userId: null });
    const [formError, setFormError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'USER'
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetUserId, setResetUserId] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await api.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
            setFormError('Failed to load users list.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user = null) => {
        setFormError('');
        setSuccessMessage('');
        if (user) {
            setEditingUser(user);
            setFormData({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
                password: '' 
            });
        } else {
            setEditingUser(null);
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                password: '',
                role: 'USER'
            });
        }
        setIsModalOpen(true);
    };

    const handleOpenResetModal = (user) => {
        setResetUserId(user.id);
        setNewPassword('');
        setFormError('');
        setSuccessMessage('');
        setIsResetModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSuccessMessage('');
        
        try {
            if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
                throw new Error('First name, last name and email are required.');
            }
            if (!editingUser && (!formData.password || formData.password.length < 6)) {
                throw new Error('Password must be at least 6 characters.');
            }
            if (formData.password && formData.password.length < 6) {
                throw new Error('Password must be at least 6 characters.');
            }

            const payload = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim().toLowerCase(),
                role: formData.role === 'USER' ? 'MANAGER' : formData.role,
            };

            if (formData.password) {
                payload.password = formData.password;
            }

            if (editingUser) {
                const updatedUser = await api.updateUser(editingUser.id, payload);
                setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updatedUser } : u));
                setSuccessMessage('User updated successfully.');
            } else {
                const newUser = await api.createUser(payload);
                setUsers(prev => [...prev, newUser]);
                setSuccessMessage('User created successfully.');
            }
            setIsModalOpen(false);
            // Refetch in background to ensure sync with server logic (e.g. default roles/status)
            loadUsers();
        } catch (error) {
            console.error('User creation/update error:', error);
            setFormError(error.message || 'An error occurred. Please try again.');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setFormError('Password must be at least 6 characters.');
            return;
        }
        try {
            await api.updateUser(resetUserId, { password: newPassword });
            setIsResetModalOpen(false);
            setFormError('');
            setSuccessMessage('Password reset successfully.');
        } catch (error) {
            setFormError(error.message);
        }
    };

    const handleDelete = async () => {
        try {
            await api.deleteUser(deleteConfirm.userId);
            setDeleteConfirm({ isOpen: false, userId: null });
            setUsers(prev => prev.filter(u => u.id !== deleteConfirm.userId));
            setFormError('');
            setSuccessMessage('User deleted successfully.');
        } catch (error) {
            setSuccessMessage('');
            setFormError(error.message);
        }
    };

    if (authUser?.role !== 'ADMIN') {
        return (
            <div style={{ padding: '1rem', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', background: 'var(--color-gray-50)' }}>
                Only admins can manage users.
            </div>
        );
    }

    if (loading) return <div>Loading users...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Manage Team Members</h3>
                <Button onClick={() => handleOpenModal()} size="sm">
                    <MdAdd /> Add User
                </Button>
            </div>
            {formError && (
                <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', padding:'10px 12px', borderRadius:'8px', marginBottom:'1rem', fontSize:'0.875rem' }}>
                    {formError}
                </div>
            )}
            {successMessage && (
                <div style={{ background:'rgba(22,163,74,0.12)', border:'1px solid rgba(22,163,74,0.25)', color:'#16a34a', padding:'10px 12px', borderRadius:'8px', marginBottom:'1rem', fontSize:'0.875rem' }}>
                    {successMessage}
                </div>
            )}

            <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', overflowX: 'auto', overflowY: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '600px' }}>
                    <thead style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: 'var(--color-gray-600)' }}>Name</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: 'var(--color-gray-600)' }}>Email</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: 'var(--color-gray-600)' }}>Role</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: 'var(--color-gray-600)' }}>Status</th>
                            <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: 'var(--color-gray-600)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ 
                                            width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-gray-100)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-600)'
                                        }}>
                                            <MdPerson />
                                        </div>
                                        {user.firstName} {user.lastName}
                                    </div>
                                </td>
                                <td style={{ padding: '12px 16px', color: 'var(--color-gray-600)' }}>{user.email}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{ 
                                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                        background: user.role === 'ADMIN' ? 'rgba(220,38,38,0.1)' : 'rgba(59,130,246,0.1)',
                                        color: user.role === 'ADMIN' ? 'var(--color-primary)' : '#3b82f6'
                                    }}>
                                        {user.role === 'ADMIN' ? 'Admin' : 'User'}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{ 
                                        width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block',
                                        background: user.isActive ? 'var(--color-accent)' : 'var(--color-gray-300)',
                                        marginRight: '6px'
                                    }}></span>
                                    {user.isActive ? 'Active' : 'Inactive'}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    <button 
                                        onClick={() => handleOpenResetModal(user)} 
                                        title="Reset Password"
                                        style={{ border: 'none', background: 'none', color: 'var(--color-accent)', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <MdVpnKey />
                                    </button>
                                    <button onClick={() => handleOpenModal(user)} style={{ border: 'none', background: 'none', color: 'var(--color-gray-500)', cursor: 'pointer', padding: '4px' }}>
                                        <MdEdit />
                                    </button>
                                    <button onClick={() => setDeleteConfirm({ isOpen: true, userId: user.id })} style={{ border: 'none', background: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px' }}>
                                        <MdDelete />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div style={{ 
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>{editingUser ? 'Edit User' : 'Add New User'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <Input label="First Name" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
                                <Input label="Last Name" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
                            </div>
                            <Input label="Email Address" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required disabled={!!editingUser} />
                            <Input label={editingUser ? "Password (leave blank to keep current)" : "Password"} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingUser} />
                            
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Role</label>
                                <select 
                                    value={formData.role} 
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)' }}
                                >
                                    <option value="ADMIN">Admin (Full Access)</option>
                                    <option value="USER">User (Restricted)</option>
                                </select>
                            </div>

                            {formError && (
                                <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', padding:'10px 12px', borderRadius:'8px', marginBottom:'1rem', fontSize:'0.875rem' }}>
                                    {formError}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit">{editingUser ? 'Update User' : 'Create User'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isResetModalOpen && (
                <div style={{ 
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Reset Password</h2>
                        <form onSubmit={handleResetPassword}>
                            <Input 
                                label="New Password" 
                                type="password" 
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)} 
                                required 
                                placeholder="Min 6 characters"
                            />
                            
                            {formError && (
                                <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', padding:'10px 12px', borderRadius:'8px', marginBottom:'1rem', fontSize:'0.875rem' }}>
                                    {formError}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <Button type="button" variant="ghost" onClick={() => setIsResetModalOpen(false)}>Cancel</Button>
                                <Button type="submit">Update Password</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={deleteConfirm.isOpen}
                title="Delete User"
                message="Are you sure you want to delete this user? This action cannot be undone."
                confirmText="Delete User"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, userId: null })}
            />
        </div>
    );
}

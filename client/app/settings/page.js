'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import styles from './settings.module.css';
import { MdPerson, MdBusiness, MdPalette, MdSave, MdRefresh, MdPeople, MdSms } from 'react-icons/md';
import ConfirmModal from '../../components/ConfirmModal';
import UserManagement from '../../components/settings/UserManagement';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
    const { user: authUser, checkAuth } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const { colors, updateColors, resetColors, presets } = useTheme();
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');

    // Local color state for the pickers (so changes are live-previewed)
    const [customPrimary, setCustomPrimary] = useState(colors.primary);
    const [customSecondary, setCustomSecondary] = useState(colors.secondary);
    const [customAccent, setCustomAccent] = useState(colors.accent);
    const [confirmState, setConfirmState] = useState({ isOpen: false, type: null, eventArgs: null });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        orgName: '',
        smsGateway: 'logger',
        smsApiKey: '',
        smsUsername: '',
        smsApiUrl: '',
    });

    useEffect(() => {
        loadSettings();
    }, []);

    // Sync local pickers with context colors
    useEffect(() => {
        setCustomPrimary(colors.primary);
        setCustomSecondary(colors.secondary);
        setCustomAccent(colors.accent);
    }, [colors]);

    const loadSettings = async () => {
        try {
            const userData = await api.getMe();
            setUser(userData.user || userData);
            setFormData({
                firstName: (userData.user || userData).firstName || '',
                lastName: (userData.user || userData).lastName || '',
                email: (userData.user || userData).email || '',
                orgName: (userData.user || userData).organization?.name || '',
                smsGateway: (userData.user || userData).organization?.settings?.smsGateway || 'logger',
                smsApiKey: (userData.user || userData).organization?.settings?.smsApiKey || '',
                smsUsername: (userData.user || userData).organization?.settings?.smsUsername || '',
                smsApiUrl: (userData.user || userData).organization?.settings?.smsApiUrl || '',
            });
        } catch (error) {
            console.error('Failed to load settings:', error);
            setSaveError('Failed to load settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRequest = (e) => {
        e.preventDefault();
        setConfirmState({ isOpen: true, type: 'SAVE' });
    };

    const handleResetRequest = () => {
        setConfirmState({ isOpen: true, type: 'RESET' });
    };

    const handleConfirmAction = async () => {
        const type = confirmState.type;
        setConfirmState({ isOpen: false, type: null });

        if (type === 'SAVE') {
            try {
                setSaveError('');
                if (activeTab === 'appearance') {
                    updateColors({
                        primary: customPrimary,
                        secondary: customSecondary,
                        accent: customAccent,
                    });
                    setSaveSuccess('Theme colors saved successfully.');
                } else if (activeTab === 'organization' || activeTab === 'sms') {
                    await api.updateOrgSettings({ 
                        name: formData.orgName,
                        smsGateway: formData.smsGateway,
                        smsApiKey: formData.smsApiKey,
                        smsUsername: formData.smsUsername,
                        smsApiUrl: formData.smsApiUrl
                    });
                    await checkAuth(); // Refresh global branding
                    setSaveSuccess('Organization settings updated successfully.');
                } else if (activeTab === 'profile') {
                    // Update profile settings logic if needed, but currently it only shows fields
                    setSaveSuccess('Profile settings saved.');
                } else {
                    setSaveSuccess('Settings saved successfully.');
                }
            } catch (error) {
                setSaveSuccess('');
                setSaveError('Failed to save settings: ' + error.message);
            }
        } else if (type === 'RESET') {
            resetColors();
            setCustomPrimary('#dc2626');
            setCustomSecondary('#000000');
            setCustomAccent('#16a34a');
            setSaveError('');
            setSaveSuccess('Theme colors reset to default.');
        } else if (type === 'CHANGE_PASSWORD') {
            const { currentPassword, newPassword } = confirmState.eventArgs || {};
            try {
                await api.changePassword(currentPassword, newPassword);
                setPasswordSuccess('Password updated successfully.');
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setTimeout(() => setIsChangingPassword(false), 2000);
            } catch (err) {
                setPasswordError(err.message || 'Failed to change password');
            }
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const applyPreset = (preset) => {
        setCustomPrimary(preset.primary);
        setCustomSecondary(preset.secondary);
        setCustomAccent(preset.accent);
        // Apply immediately for live preview
        updateColors({
            primary: preset.primary,
            secondary: preset.secondary,
            accent: preset.accent,
        });
    };

    const handleColorChange = (setter, value) => {
        setter(value);
        // Live preview: apply to CSS vars immediately
        const updates = {
            primary: customPrimary,
            secondary: customSecondary,
            accent: customAccent,
        };
        if (setter === setCustomPrimary) updates.primary = value;
        if (setter === setCustomSecondary) updates.secondary = value;
        if (setter === setCustomAccent) updates.accent = value;
        updateColors(updates);
    };

    const tabs = [
        { id: 'profile', label: 'My Profile', icon: MdPerson },
        { id: 'organization', label: 'Organization', icon: MdBusiness },
        ...(authUser?.role === 'ADMIN' ? [
            { id: 'users', label: 'User Management', icon: MdPeople },
            { id: 'sms', label: 'SMS Gateway', icon: MdSms }
        ] : []),
        { id: 'branding', label: 'Branding', icon: MdPalette },
        { id: 'appearance', label: 'Theme Colors', icon: MdPalette },
    ];

    useEffect(() => {
        if (activeTab === 'users' && authUser?.role !== 'ADMIN') {
            setActiveTab('profile');
        }
    }, [activeTab, authUser]);

    useEffect(() => {
        setSaveError('');
        setSaveSuccess('');
    }, [activeTab]);

    if (loading && !user) {
        return <DashboardLayout><div className={styles.container}>Loading...</div></DashboardLayout>;
    }

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <h1 className={styles.title}>Settings</h1>
                <p className={styles.subtitle}>Manage your account and preferences</p>
                {saveError && <div className={styles.errorBanner} style={{ marginBottom: '1rem' }}>{saveError}</div>}
                {saveSuccess && <div className={styles.successBanner} style={{ marginBottom: '1rem' }}>{saveSuccess}</div>}

                <div className={styles.layout}>
                    <div className={styles.sidebar}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <tab.icon className={styles.tabIcon} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className={styles.content}>
                        <Card title={tabs.find(t => t.id === activeTab)?.label || 'Settings'}>
                            <form onSubmit={handleSaveRequest}>
                                {activeTab === 'profile' && (
                                    <div className={styles.formGrid}>
                                        <Input
                                            label="First Name"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                        />
                                        <Input
                                            label="Last Name"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                        />
                                        <Input
                                            label="Email Address"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            type="email"
                                            disabled
                                        />

                                        <div className={styles.sectionHeader}>
                                            <h3>Account Security</h3>
                                            <p>Manage your password and security settings.</p>
                                        </div>

                                        {!isChangingPassword ? (
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    onClick={() => setIsChangingPassword(true)}
                                                >
                                                    Change Password
                                                </Button>
                                            </div>
                                        ) : (
                                            <div style={{ background: 'var(--color-gray-50)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-200)', marginTop: '1rem' }}>
                                                <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Updating Password</h4>
                                                <Input
                                                    label="Current Password"
                                                    type="password"
                                                    value={passwordForm.currentPassword}
                                                    onChange={(e) => { setPasswordForm({ ...passwordForm, currentPassword: e.target.value }); setPasswordError(''); setPasswordSuccess(''); }}
                                                    placeholder="Enter current password"
                                                />
                                                <Input
                                                    label="New Password"
                                                    type="password"
                                                    value={passwordForm.newPassword}
                                                    onChange={(e) => { setPasswordForm({ ...passwordForm, newPassword: e.target.value }); setPasswordError(''); setPasswordSuccess(''); }}
                                                    placeholder="At least 6 characters"
                                                />
                                                <Input
                                                    label="Confirm New Password"
                                                    type="password"
                                                    value={passwordForm.confirmPassword}
                                                    onChange={(e) => { setPasswordForm({ ...passwordForm, confirmPassword: e.target.value }); setPasswordError(''); setPasswordSuccess(''); }}
                                                    placeholder="Re-enter new password"
                                                />
                                                {passwordError && <div className={styles.errorBanner}>{passwordError}</div>}
                                                {passwordSuccess && <div className={styles.successBanner}>{passwordSuccess}</div>}
                                                <div style={{ display:'flex', gap:'1rem', marginTop:'1rem' }}>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setIsChangingPassword(false);
                                                            setPasswordForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
                                                            setPasswordError('');
                                                            setPasswordSuccess('');
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={() => {
                                                            setPasswordError('');
                                                            setPasswordSuccess('');
                                                            if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
                                                                setPasswordError('Please fill all password fields.');
                                                                return;
                                                            }
                                                            if (passwordForm.newPassword.length < 6) {
                                                                setPasswordError('New password must be at least 6 characters.');
                                                                return;
                                                            }
                                                            if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                                                                setPasswordError('Passwords do not match.');
                                                                return;
                                                            }
                                                            setConfirmState({ isOpen: true, type: 'CHANGE_PASSWORD', eventArgs: { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword } });
                                                        }}
                                                    >
                                                        Update Password
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'organization' && (
                                    <div className={styles.formGrid}>
                                        <Input
                                            label="Organization Name"
                                            name="orgName"
                                            value={formData.orgName}
                                            onChange={handleChange}
                                        />
                                        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                                            <label style={{fontSize:'0.875rem',fontWeight:600,color:'var(--color-gray-700)'}}>Company ID</label>
                                            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                                                <input
                                                    type="text"
                                                    value={user?.organization?.companyId || user?.organizationId?.slice(0,8) || '—'}
                                                    readOnly
                                                    style={{
                                                        flex:1, padding:'10px 14px', border:'1px solid var(--color-gray-300)',
                                                        borderRadius:'var(--radius-md)', background:'var(--color-gray-50)',
                                                        fontFamily:'monospace', fontSize:'0.95rem', fontWeight:600,
                                                        color:'var(--color-gray-800)', letterSpacing:'1px'
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const id = user?.organization?.companyId || user?.organizationId;
                                                        if (!id) return;
                                                        navigator.clipboard.writeText(id)
                                                            .then(() => {
                                                                setSaveError('');
                                                                setSaveSuccess('Company ID copied successfully.');
                                                            })
                                                            .catch(() => {
                                                                setSaveSuccess('');
                                                                setSaveError('Failed to copy Company ID.');
                                                            });
                                                    }}
                                                    style={{
                                                        padding:'10px 16px', border:'1px solid var(--color-gray-300)',
                                                        borderRadius:'var(--radius-md)', background:'white',
                                                        cursor:'pointer', fontSize:'0.85rem', fontWeight:600,
                                                        color:'var(--color-primary)', transition:'all 0.2s'
                                                    }}
                                                >
                                                    📋 Copy
                                                </button>
                                            </div>
                                            <p style={{fontSize:'0.75rem',color:'var(--color-gray-500)',margin:0}}>
                                                Use this ID to identify your organization across the platform.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'sms' && (
                                    <div className={styles.formGrid}>
                                        <div className={styles.sectionHeader}>
                                            <h3>SMS Provider Configuration</h3>
                                            <p>Configure how the system sends SMS messages. Defaults to simulation mode.</p>
                                        </div>
                                        
                                        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                                            <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                                                <label style={{fontSize:'0.875rem', fontWeight:600, color:'var(--color-gray-700)'}}>Gateway Type</label>
                                                <select
                                                    name="smsGateway"
                                                    value={formData.smsGateway}
                                                    onChange={handleChange}
                                                    style={{
                                                        padding: '10px 14px', border: '1px solid var(--color-gray-300)',
                                                        borderRadius: 'var(--radius-md)', background: 'white', flex: 1
                                                    }}
                                                >
                                                    <option value="logger">Logger (Simulation)</option>
                                                    <option value="http">HTTP API (Africa's Talking)</option>
                                                </select>
                                            </div>

                                            {formData.smsGateway === 'http' && (
                                                <>
                                                    <Input
                                                        label="API Username"
                                                        name="smsUsername"
                                                        value={formData.smsUsername}
                                                        onChange={handleChange}
                                                        placeholder="e.g. sandbox or your_username"
                                                    />
                                                    <Input
                                                        label="API Key"
                                                        name="smsApiKey"
                                                        value={formData.smsApiKey}
                                                        onChange={handleChange}
                                                        type="password"
                                                        placeholder="Your provider API key"
                                                    />
                                                    <Input
                                                        label="API URL (Optional)"
                                                        name="smsApiUrl"
                                                        value={formData.smsApiUrl}
                                                        onChange={handleChange}
                                                        placeholder="Leave blank for default Africa's Talking API"
                                                    />
                                                    <p style={{fontSize:'0.75rem', color:'var(--color-gray-500)', marginTop:'-0.5rem'}}>
                                                        Default URL: <code>https://api.sandbox.africastalking.com/version1/messaging</code> (Sandbox) or <code>https://api.africastalking.com/version1/messaging</code> (Production)
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'branding' && (
                                    <div className={styles.brandingGrid}>
                                        <div style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
                                            <div className={styles.sectionHeader}>
                                                <h3>Company Logo</h3>
                                                <p>Upload your company logo to appear in the application header</p>
                                            </div>
                                            
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '2rem', 
                                                padding: '2rem', border: '2px dashed var(--color-gray-200)', borderRadius: 'var(--radius-lg)',
                                                background: 'var(--color-gray-50)'
                                            }}>
                                                <div style={{
                                                    width: '120px', height: '120px', background: 'white', 
                                                    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                                                }}>
                                                    {user?.organization?.settings?.logoUrl ? (
                                                        <img src={api.ensureAbsoluteUrl(user.organization.settings.logoUrl)} alt="Logo" style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}} />
                                                    ) : (
                                                        <div style={{fontSize: '2rem', fontWeight: 800, color: 'var(--color-gray-300)'}}>LOGO</div>
                                                    )}
                                                </div>
                                                
                                                <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                                                    <input 
                                                        type="file" 
                                                        id="logo-upload" 
                                                        hidden 
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                const allowed = ['image/jpeg','image/jpg','image/png','image/svg+xml','image/webp'];
                                                                if (!allowed.includes(file.type)) {
                                                                    setSaveSuccess('');
                                                                    setSaveError('Only JPG, PNG, SVG, WEBP images are allowed.');
                                                                    return;
                                                                }
                                                                if (file.size > 2 * 1024 * 1024) {
                                                                    setSaveSuccess('');
                                                                    setSaveError('File is too large. Max 2MB.');
                                                                    return;
                                                                }
                                                                try {
                                                                    setLoading(true);
                                                                    setSaveError('');
                                                                    const result = await api.uploadLogo(file);
                                                                    await loadSettings();
                                                                    if (typeof checkAuth === 'function') {
                                                                        await checkAuth();
                                                                    }
                                                                    setSaveSuccess(result?.message || 'Logo updated successfully.');
                                                                } catch (error) {
                                                                    setSaveSuccess('');
                                                                    setSaveError(error.message);
                                                                } finally {
                                                                    setLoading(false);
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <Button type="button" onClick={() => document.getElementById('logo-upload').click()}>
                                                        {user?.organization?.settings?.logoUrl ? 'Change Logo' : 'Upload Logo'}
                                                    </Button>
                                                    <p style={{fontSize: '0.75rem', color: 'var(--color-gray-500)'}}>
                                                        Recommended size: 256x256px. PNG, JPG or SVG.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'users' && (
                                    <UserManagement />
                                )}

                                {activeTab === 'appearance' && (
                                    <div className={styles.appearanceSection}>
                                        <div className={styles.sectionHeader}>
                                            <h3>Preset Themes</h3>
                                            <p>Click a preset to apply it instantly</p>
                                        </div>
                                        <div className={styles.presetGrid}>
                                            {presets.map((preset) => (
                                                <button
                                                    key={preset.name}
                                                    type="button"
                                                    className={styles.presetCard}
                                                    onClick={() => applyPreset(preset)}
                                                >
                                                    <div className={styles.presetSwatches}>
                                                        <span style={{ backgroundColor: preset.primary }}></span>
                                                        <span style={{ backgroundColor: preset.secondary }}></span>
                                                        <span style={{ backgroundColor: preset.accent }}></span>
                                                    </div>
                                                    <div className={styles.presetName}>{preset.name}</div>
                                                </button>
                                            ))}
                                        </div>

                                        <div className={styles.sectionHeader}>
                                            <h3>Custom Colors</h3>
                                            <p>Pick your own brand colors</p>
                                        </div>
                                        <div className={styles.colorPickerGrid}>
                                            <div className={styles.colorPicker}>
                                                <label>Primary Color</label>
                                                <p className={styles.colorHint}>Buttons, active states, highlights</p>
                                                <div className={styles.pickerRow}>
                                                    <input
                                                        type="color"
                                                        value={customPrimary}
                                                        onChange={(e) => handleColorChange(setCustomPrimary, e.target.value)}
                                                        className={styles.colorInput}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={customPrimary}
                                                        onChange={(e) => handleColorChange(setCustomPrimary, e.target.value)}
                                                        className={styles.hexInput}
                                                        maxLength={7}
                                                    />
                                                </div>
                                            </div>

                                            <div className={styles.colorPicker}>
                                                <label>Secondary Color</label>
                                                <p className={styles.colorHint}>Sidebar, navigation background</p>
                                                <div className={styles.pickerRow}>
                                                    <input
                                                        type="color"
                                                        value={customSecondary}
                                                        onChange={(e) => handleColorChange(setCustomSecondary, e.target.value)}
                                                        className={styles.colorInput}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={customSecondary}
                                                        onChange={(e) => handleColorChange(setCustomSecondary, e.target.value)}
                                                        className={styles.hexInput}
                                                        maxLength={7}
                                                    />
                                                </div>
                                            </div>

                                            <div className={styles.colorPicker}>
                                                <label>Accent Color</label>
                                                <p className={styles.colorHint}>Success states, badges, accents</p>
                                                <div className={styles.pickerRow}>
                                                    <input
                                                        type="color"
                                                        value={customAccent}
                                                        onChange={(e) => handleColorChange(setCustomAccent, e.target.value)}
                                                        className={styles.colorInput}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={customAccent}
                                                        onChange={(e) => handleColorChange(setCustomAccent, e.target.value)}
                                                        className={styles.hexInput}
                                                        maxLength={7}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.sectionHeader}>
                                            <h3>Live Preview</h3>
                                        </div>
                                        <div className={styles.livePreview}>
                                            <div className={styles.previewSidebar} style={{ backgroundColor: customSecondary }}>
                                                <div className={styles.previewLogo} style={{ backgroundColor: customPrimary }}>C</div>
                                                <div className={styles.previewNavItem} style={{ backgroundColor: customPrimary, color: '#fff' }}>Dashboard</div>
                                                <div className={styles.previewNavItem}>Campaigns</div>
                                                <div className={styles.previewNavItem}>Contacts</div>
                                            </div>
                                            <div className={styles.previewContent}>
                                                <div className={styles.previewHeader}>
                                                    <span style={{ color: customPrimary, fontWeight: 700 }}>■</span> Your Dashboard Preview
                                                </div>
                                                <div className={styles.previewCards}>
                                                    <div className={styles.previewCard} style={{ borderTopColor: customPrimary }}>
                                                        <div style={{ color: customPrimary, fontWeight: 700 }}>128</div>
                                                        <div>Contacts</div>
                                                    </div>
                                                    <div className={styles.previewCard} style={{ borderTopColor: customAccent }}>
                                                        <div style={{ color: customAccent, fontWeight: 700 }}>5</div>
                                                        <div>Campaigns</div>
                                                    </div>
                                                </div>
                                                <button className={styles.previewBtn} style={{ backgroundColor: customPrimary }}>
                                                    Create Campaign
                                                </button>
                                                <span className={styles.previewBadge} style={{ backgroundColor: customAccent }}>
                                                    Active
                                                </span>
                                            </div>
                                        </div>

                                        <div className={styles.resetRow}>
                                            <Button type="button" variant="ghost" onClick={handleResetRequest}>
                                                <MdRefresh /> Reset to Default
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {activeTab !== 'users' && activeTab !== 'branding' && (
                                    <div className={styles.actions}>
                                        <Button type="submit">
                                            <MdSave /> Save Changes
                                        </Button>
                                    </div>
                                )}
                            </form>
                        </Card>
                    </div>
                </div>

                <ConfirmModal 
                    isOpen={confirmState.isOpen}
                    title={
                        confirmState.type === 'SAVE'
                            ? 'Save Settings'
                            : confirmState.type === 'RESET'
                                ? 'Reset Defaults'
                                : 'Change Password'
                    }
                    message={
                        confirmState.type === 'SAVE'
                            ? 'Are you sure you want to save these settings?'
                            : confirmState.type === 'RESET'
                                ? 'Are you sure you want to reset all theme settings back to the system default? This cannot be undone.'
                                : 'Update your password now? You will need to use the new password on next login.'
                    }
                    confirmText={
                        confirmState.type === 'SAVE'
                            ? 'Save Changes'
                            : confirmState.type === 'RESET'
                                ? 'Reset'
                                : 'Update Password'
                    }
                    variant={confirmState.type === 'RESET' ? 'danger' : 'primary'}
                    onConfirm={handleConfirmAction}
                    onCancel={() => setConfirmState({ isOpen: false, type: null })}
                />
            </div>
        </DashboardLayout>
    );
}

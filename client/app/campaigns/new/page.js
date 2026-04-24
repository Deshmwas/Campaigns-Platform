'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import api from '../../../lib/api';
import styles from './new.module.css';
import { MdArrowForward, MdArrowBack, MdSend, MdSchedule, MdPreview } from 'react-icons/md';

function NewCampaignContent() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [lists, setLists] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [smsTemplates, setSmsTemplates] = useState([]);
    const [senders, setSenders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [formData, setFormData] = useState({
        name: '', type: 'EMAIL', subject: '', content: '',
        listIds: [], templateId: '', senderEmailId: '',
        scheduledAt: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    useEffect(() => {
        Promise.all([
            api.getLists().catch(() => []),
            api.getEmailTemplates().catch(() => []),
            api.getSmsTemplates().catch(() => []),
            api.getSenders().catch(() => []),
        ]).then(([l, t, st, s]) => {
            setLists(l || []);
            setTemplates(t || []);
            setSmsTemplates(st || []);
            setSenders(s || []);
        });
    }, []);

    useEffect(() => {
        // Handle returning from template selection
        const searchParams = new URLSearchParams(window.location.search);
        const returnStep = searchParams.get('step');
        const selectedTemplateId = searchParams.get('templateId');
        const selectedContent = searchParams.get('content');

        if (returnStep) {
            const savedData = localStorage.getItem('campaign_draft');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                const selectedSubject = searchParams.get('subject');
                setFormData(prev => ({
                    ...prev,
                    ...parsed,
                    templateId: selectedTemplateId || prev.templateId,
                    content: selectedContent ? decodeURIComponent(selectedContent) : prev.content,
                    subject: (selectedSubject && !parsed.subject) ? decodeURIComponent(selectedSubject) : (parsed.subject || prev.subject)
                }));
                setStep(parseInt(returnStep));
            }
        }
    }, []);

    const handleNextFromStep1 = () => {
        if (!formData.name) {
            alert('Enter a campaign name');
            return;
        }
        localStorage.setItem('campaign_draft', JSON.stringify(formData));
        if (formData.type === 'EMAIL') {
            router.push('/templates/email?source=new_campaign');
        } else {
            router.push('/templates/sms?source=new_campaign');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleTemplateSelect = (template) => {
        setFormData({
            ...formData,
            templateId: template.id,
            content: formData.type === 'EMAIL' 
                ? (template.htmlContent || '') 
                : (template.content || ''),
            subject: formData.subject || template.subject || '',
        });
    };

    const handleListToggle = (listId) => {
        const isSelected = formData.listIds.includes(listId);
        setFormData({
            ...formData,
            listIds: isSelected
                ? formData.listIds.filter((id) => id !== listId)
                : [...formData.listIds, listId],
        });
    };

    const handleSubmit = async (sendNow = false) => {
        setLoading(true);
        try {
            const payload = {
                ...formData,
                scheduledAt: sendNow ? null : (formData.scheduledAt || null),
            };
            const campaign = await api.createCampaign(payload);

            if (sendNow) {
                await api.sendCampaign(campaign.id);
                alert('Campaign sent!');
            } else if (formData.scheduledAt) {
                alert('Campaign scheduled successfully!');
            } else {
                alert('Campaign saved as draft!');
            }
            router.push('/campaigns');
        } catch (error) {
            alert('Failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const totalContacts = lists.filter(l => formData.listIds.includes(l.id))
        .reduce((sum, l) => sum + (l._count?.memberships || 0), 0);

    const STEPS = ['Details', 'Template', 'Recipients', 'Sender', 'Review'];

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <h1 className={styles.title}>Create Campaign</h1>

                {/* Step Indicator */}
                <div className={styles.steps}>
                    {STEPS.map((s, i) => (
                        <div key={s} className={`${styles.step} ${step > i+1 ? styles.stepDone : ''} ${step === i+1 ? styles.stepActive : ''}`}
                            onClick={() => i+1 < step && setStep(i+1)}>
                            <div className={styles.stepDot}>{i+1}</div>
                            <span>{s}</span>
                        </div>
                    ))}
                </div>

                {/* Step 1: Details */}
                {step === 1 && (
                    <Card>
                        <div className={styles.stepContent}>
                            <h2>Campaign Details</h2>
                            <Input label="Campaign Name" name="name" value={formData.name}
                                onChange={handleChange} required placeholder="Monthly Newsletter" />
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Campaign Type</label>
                                <div className={styles.radioGroup}>
                                    <label className={`${styles.radioCard} ${formData.type === 'EMAIL' ? styles.radioActive : ''}`}>
                                        <input type="radio" name="type" value="EMAIL" checked={formData.type === 'EMAIL'} onChange={handleChange} />
                                        <span>📧 Email</span>
                                    </label>
                                    <label className={`${styles.radioCard} ${formData.type === 'SMS' ? styles.radioActive : ''}`}>
                                        <input type="radio" name="type" value="SMS" checked={formData.type === 'SMS'} onChange={handleChange} />
                                        <span>💬 SMS</span>
                                    </label>
                                </div>
                            </div>
                            {formData.type === 'EMAIL' && (
                                <Input label="Subject Line" name="subject" value={formData.subject}
                                    onChange={handleChange} required placeholder="Your Monthly Update" />
                            )}
                            <div className={styles.stepActions}>
                                <div></div>
                                <Button onClick={handleNextFromStep1}>
                                     Next <MdArrowForward />
                                 </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Step 2: Template is now handled via redirection */}

                {/* Step 3: Recipients */}
                {step === 3 && (
                    <Card>
                        <div className={styles.stepContent}>
                            <h2>Select Recipients</h2>
                            {lists.length === 0 ? (
                                <p className={styles.empty}>No lists. Create a list first!</p>
                            ) : (
                                <div className={styles.listGrid}>
                                    {lists.map((list) => (
                                        <label key={list.id} className={`${styles.listItem} ${formData.listIds.includes(list.id) ? styles.listActive : ''}`}>
                                            <input type="checkbox" checked={formData.listIds.includes(list.id)}
                                                onChange={() => handleListToggle(list.id)} />
                                            <div className={styles.listInfo}>
                                                <div className={styles.listName}>{list.name}</div>
                                                <div className={styles.listCount}>{list._count?.memberships || 0} contacts</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {totalContacts > 0 && (
                                <p className={styles.recipientCount}>📬 {totalContacts} total recipients selected</p>
                            )}
                            <div className={styles.stepActions}>
                                <Button variant="ghost" onClick={() => {
                                    if (formData.type === 'EMAIL') router.push('/templates/email?source=new_campaign');
                                    else router.push('/templates/sms?source=new_campaign');
                                }}><MdArrowBack /> Back</Button>
                                <Button onClick={() => setStep(4)}>Next <MdArrowForward /></Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Step 4: Sender */}
                {step === 4 && (
                    <Card>
                        <div className={styles.stepContent}>
                            <h2>Select Sender</h2>
                            {formData.type === 'EMAIL' ? (
                                senders.length === 0 ? (
                                    <div className={styles.empty}>
                                        <p>No sender accounts configured.</p>
                                        <Button variant="ghost" onClick={() => router.push('/senders')}>Add Sender Account</Button>
                                    </div>
                                ) : (
                                    <div className={styles.senderGrid}>
                                        <label className={`${styles.senderItem} ${!formData.senderEmailId ? styles.senderActive : ''}`}>
                                            <input type="radio" name="senderEmailId" value="" checked={!formData.senderEmailId}
                                                onChange={() => setFormData({...formData, senderEmailId: ''})} />
                                            <div>
                                                <strong>Default Sender</strong>
                                                <span>Use system default SMTP</span>
                                            </div>
                                        </label>
                                        {senders.filter(s => s.isActive).map(sender => (
                                            <label key={sender.id} className={`${styles.senderItem} ${formData.senderEmailId === sender.id ? styles.senderActive : ''}`}>
                                                <input type="radio" name="senderEmailId" value={sender.id}
                                                    checked={formData.senderEmailId === sender.id}
                                                    onChange={() => setFormData({...formData, senderEmailId: sender.id})} />
                                                <div>
                                                    <strong>{sender.name}</strong>
                                                    <span>{sender.email}</span>
                                                    {sender.isVerified && <span className={styles.verifiedBadge}>✓ Verified</span>}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <p className={styles.hint}>SMS campaigns use the configured SMS gateway.</p>
                            )}

                            {/* Scheduling */}
                            <div className={styles.scheduleSection}>
                                <h3>Schedule (Optional)</h3>
                                <Input label="Schedule Date & Time" name="scheduledAt" type="datetime-local"
                                    value={formData.scheduledAt} onChange={handleChange} />
                                <p className={styles.hint}>Leave empty to save as draft or send immediately</p>
                            </div>

                            <div className={styles.stepActions}>
                                <Button variant="ghost" onClick={() => setStep(3)}><MdArrowBack /> Back</Button>
                                <Button onClick={() => setStep(5)}>Review <MdArrowForward /></Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Step 5: Review & Send */}
                {step === 5 && (
                    <Card>
                        <div className={styles.stepContent}>
                            <h2>Review Campaign</h2>
                            <div className={styles.reviewGrid}>
                                <div className={styles.reviewItem}><label>Name</label><span>{formData.name}</span></div>
                                <div className={styles.reviewItem}><label>Type</label><span>{formData.type}</span></div>
                                {formData.type === 'EMAIL' && <div className={styles.reviewItem}><label>Subject</label><span>{formData.subject}</span></div>}
                                <div className={styles.reviewItem}><label>Recipients</label><span>{totalContacts} contacts from {formData.listIds.length} list(s)</span></div>
                                <div className={styles.reviewItem}><label>Sender</label><span>{formData.senderEmailId ? senders.find(s => s.id === formData.senderEmailId)?.name || 'Custom' : 'Default'}</span></div>
                                {formData.scheduledAt && <div className={styles.reviewItem}><label>Scheduled</label><span>{new Date(formData.scheduledAt).toLocaleString()}</span></div>}
                            </div>

                            {formData.type === 'EMAIL' && formData.content && (
                                <div className={styles.previewToggle}>
                                    <Button variant="ghost" onClick={() => setShowPreview(!showPreview)}>
                                        <MdPreview /> {showPreview ? 'Hide Preview' : 'Preview Email'}
                                    </Button>
                                    {showPreview && (
                                        <div className={styles.previewFrame}>
                                            <iframe srcDoc={formData.content} title="Preview" style={{width:'100%',height:'400px',border:'1px solid #e5e7eb',borderRadius:'8px'}} />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={styles.stepActions}>
                                <Button variant="ghost" onClick={() => setStep(4)}><MdArrowBack /> Back</Button>
                                <div className={styles.sendActions}>
                                    <Button variant="ghost" onClick={() => handleSubmit(false)} loading={loading}>
                                        {formData.scheduledAt ? <><MdSchedule /> Schedule</> : 'Save as Draft'}
                                    </Button>
                                    <Button onClick={() => handleSubmit(true)} loading={loading}>
                                        <MdSend /> Send Now
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}

export default function NewCampaignPage() {
    return (
        <Suspense fallback={null}>
            <NewCampaignContent />
        </Suspense>
    );
}

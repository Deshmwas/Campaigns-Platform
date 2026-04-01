'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Button from '../../../components/Button';
import api from '../../../lib/api';
import styles from './builder.module.css';
import { MdTextFields, MdImage, MdSmartButton, MdHorizontalRule, MdTitle, MdShare, MdSave, MdPreview, MdDelete, MdArrowUpward, MdArrowDownward, MdContentCopy, MdArrowBack, MdAdd, MdClose } from 'react-icons/md';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaYoutube, FaTiktok } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

const SOCIAL_PLATFORMS = [
    { name: 'Facebook', color: '#1877F2' },
    { name: 'X', color: '#000000' },
    { name: 'Instagram', color: '#E4405F' },
    { name: 'LinkedIn', color: '#0A66C2' },
    { name: 'YouTube', color: '#FF0000' },
    { name: 'TikTok', color: '#000000' },
];

function getSocialIcon(platform, size = 16) {
    const p = platform.toLowerCase();
    if (p === 'facebook') return <FaFacebookF size={size} />;
    if (p === 'x' || p === 'twitter') return <FaXTwitter size={size} />;
    if (p === 'instagram') return <FaInstagram size={size} />;
    if (p === 'linkedin') return <FaLinkedinIn size={size} />;
    if (p === 'youtube') return <FaYoutube size={size} />;
    if (p === 'tiktok') return <FaTiktok size={size} />;
    return <MdShare size={size} />;
}

function getSocialColor(platform) {
    const found = SOCIAL_PLATFORMS.find(p => p.name.toLowerCase() === platform.toLowerCase());
    return found ? found.color : '#6b7280';
}

const BLOCK_TYPES = [
    { type: 'heading', label: 'Header', icon: MdTitle, defaultData: { text: 'Your Headline Here', level: 'h1', align: 'center' } },
    { type: 'text', label: 'Text', icon: MdTextFields, defaultData: { text: 'Write your content here. Use merge tags like {{first_name}} to personalize.', align: 'left' } },
    { 
        type: 'image', 
        label: 'Image', 
        icon: MdImage, 
        defaultData: { 
            src: 'https://placehold.co/600x240/dc2626/white?text=Your+Image', 
            alt: 'Image', 
            width: '100%', 
            height: 'auto',
            align: 'center',
            background: '#ffffff',
            padding: '12px',
            margin: '0 auto',
            radius: '8px'
        } 
    },
    { type: 'button', label: 'Button', icon: MdSmartButton, defaultData: { text: 'Click Here', url: 'https://example.com', color: '#dc2626', textColor: '#ffffff', align: 'center' } },
    { type: 'divider', label: 'Divider', icon: MdHorizontalRule, defaultData: { style: 'solid', color: '#e5e7eb' } },
    { type: 'social', label: 'Social', icon: MdShare, defaultData: { links: [{ platform: 'Facebook', url: '#' }, { platform: 'X', url: '#' }, { platform: 'Instagram', url: '#' }, { platform: 'LinkedIn', url: '#' }] } },
    { type: 'footer', label: 'Footer', icon: MdHorizontalRule, defaultData: { text: '© 2026 Company. All rights reserved.', unsubscribeUrl: '{{unsubscribe_url}}' } },
];

function generateHTML(blocks) {
    let body = '';
    for (const block of blocks) {
        switch (block.type) {
            case 'heading':
                body += `<${block.data.level} style="text-align:${block.data.align};margin:0;padding:16px 24px;font-family:Arial,sans-serif;color:#111827">${block.data.text}</${block.data.level}>`;
                break;
            case 'text':
                body += `<p style="text-align:${block.data.align};margin:0;padding:12px 24px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151">${block.data.text}</p>`;
                break;
            case 'image': {
                const width = block.data.width || '100%';
                const height = block.data.height || 'auto';
                const align = block.data.align || 'center';
                const background = block.data.background || '#ffffff';
                const padding = block.data.padding || '12px';
                const margin = block.data.margin || '0 auto';
                const radius = block.data.radius || '8px';
                body += `<div style="text-align:${align};padding:${padding};background:${background};margin:${margin}"><img src="${block.data.src}" alt="${block.data.alt || ''}" style="display:inline-block;max-width:100%;width:${width};height:${height};border-radius:${radius};" /></div>`;
                break;
            }
            case 'button':
                body += `<div style="text-align:${block.data.align};padding:16px 24px"><a href="${block.data.url}" style="display:inline-block;padding:14px 32px;background:${block.data.color};color:${block.data.textColor};text-decoration:none;border-radius:8px;font-family:Arial,sans-serif;font-weight:600;font-size:15px">${block.data.text}</a></div>`;
                break;
            case 'divider':
                body += `<hr style="border:none;border-top:1px ${block.data.style} ${block.data.color};margin:16px 24px" />`;
                break;
            case 'social':
                const socialIcons = block.data.links.map(l => {
                    const c = SOCIAL_PLATFORMS.find(p => p.name.toLowerCase() === l.platform.toLowerCase())?.color || '#6b7280';
                    return `<a href="${l.url}" style="display:inline-block;margin:0 6px;width:36px;height:36px;border-radius:50%;background:${c};color:#fff;text-align:center;line-height:36px;font-size:14px;font-weight:700;text-decoration:none;font-family:Arial,sans-serif" title="${l.platform}">${l.platform.charAt(0).toUpperCase()}</a>`;
                }).join('');
                body += `<div style="text-align:center;padding:16px 24px">${socialIcons}</div>`;
                break;
            case 'footer':
                body += `<div style="text-align:center;padding:20px 24px;font-size:12px;color:#9ca3af;font-family:Arial,sans-serif"><p style="margin:0">${block.data.text}</p><p style="margin:8px 0 0"><a href="${block.data.unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a></p></div>`;
                break;
        }
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Email</title></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05)">${body}</div></body></html>`;
}

function BuilderContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const templateId = searchParams.get('id');

    const [blocks, setBlocks] = useState([]);
    const [selected, setSelected] = useState(null);
    const [templateName, setTemplateName] = useState('');
    const [subject, setSubject] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (templateId) {
            api.getEmailTemplate(templateId).then(data => {
                setTemplateName(data.name || '');
                setSubject(data.subject || '');
                if (data.designJson && Array.isArray(data.designJson)) {
                    setBlocks(data.designJson);
                }
                setLoading(false);
            }).catch(err => {
                console.error(err);
                setErrorMessage('Failed to load template.');
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [templateId]);

    const addBlock = useCallback((blockType) => {
        const newBlock = { id: Date.now().toString(), type: blockType.type, data: { ...blockType.defaultData } };
        setBlocks(prev => [...prev, newBlock]);
        setSelected(newBlock.id);
    }, []);

    const updateBlock = useCallback((id, newData) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, data: { ...b.data, ...newData } } : b));
    }, []);

    const removeBlock = useCallback((id) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
        if (selected === id) setSelected(null);
    }, [selected]);

    const moveBlock = useCallback((id, dir) => {
        setBlocks(prev => {
            const idx = prev.findIndex(b => b.id === id);
            if ((dir === -1 && idx === 0) || (dir === 1 && idx === prev.length - 1)) return prev;
            const arr = [...prev];
            [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
            return arr;
        });
    }, []);

    const duplicateBlock = useCallback((id) => {
        setBlocks(prev => {
            const idx = prev.findIndex(b => b.id === id);
            const clone = { ...prev[idx], id: Date.now().toString(), data: { ...prev[idx].data } };
            const arr = [...prev];
            arr.splice(idx + 1, 0, clone);
            return arr;
        });
    }, []);

    const handleSave = async () => {
        if (!templateName) {
            setSuccessMessage('');
            setErrorMessage('Please enter a template name.');
            return;
        }
        setSaving(true);
        try {
            setErrorMessage('');
            const html = generateHTML(blocks);
            const payload = { name: templateName, subject: subject || templateName, htmlContent: html, designJson: blocks };
            if (templateId) {
                await api.updateEmailTemplate(templateId, payload);
                setSuccessMessage('Template updated successfully.');
            } else {
                const res = await api.createEmailTemplate(payload);
                router.replace(`/templates/builder?id=${res.id}`);
                setSuccessMessage('Template saved successfully.');
            }
        } catch (err) {
            setSuccessMessage('');
            setErrorMessage(err.message);
        }
        finally { setSaving(false); }
    };

    if (loading) {
        return <div style={{padding:'4rem',textAlign:'center'}}>Loading builder...</div>;
    }

    const selectedBlock = blocks.find(b => b.id === selected);

    return (
        <DashboardLayout>
            <div className={styles.builder}>
                {/* Left: Block Palette */}
                <div className={styles.palette}>
                    <h3 className={styles.paletteTitle}>Blocks</h3>
                    <div className={styles.blockList}>
                        {BLOCK_TYPES.map(bt => (
                            <button key={bt.type} className={styles.blockBtn} onClick={() => addBlock(bt)}>
                                <bt.icon /> {bt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Center: Canvas */}
                <div className={styles.canvas}>
                    <div className={styles.canvasHeader}>
                        <input className={styles.nameInput} value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template name..." />
                        <input className={styles.nameInput} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." style={{fontSize:'0.85rem'}} />
                        <div className={styles.canvasActions}>
                            <Button variant="ghost" onClick={() => setShowPreview(!showPreview)}>
                                <MdPreview /> {showPreview ? 'Edit' : 'Preview'}
                            </Button>
                            <Button onClick={handleSave} loading={saving}><MdSave /> Save</Button>
                        </div>
                    </div>
                    {errorMessage && (
                        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', padding:'10px 12px', borderRadius:'8px', marginBottom:'1rem', fontSize:'0.875rem' }}>
                            {errorMessage}
                        </div>
                    )}
                    {successMessage && (
                        <div style={{ background:'rgba(22,163,74,0.12)', border:'1px solid rgba(22,163,74,0.25)', color:'#16a34a', padding:'10px 12px', borderRadius:'8px', marginBottom:'1rem', fontSize:'0.875rem' }}>
                            {successMessage}
                        </div>
                    )}

                    {showPreview ? (
                        <div className={styles.previewFrame}>
                            <iframe srcDoc={generateHTML(blocks)} className={styles.iframe} title="Preview" />
                        </div>
                    ) : (
                        <div className={styles.canvasBody}>
                            {blocks.length === 0 ? (
                                <div className={styles.canvasEmpty}>
                                    <p>Click blocks on the left to start building your email template</p>
                                </div>
                            ) : (
                                blocks.map((block, idx) => (
                                    <div key={block.id} className={`${styles.blockItem} ${selected === block.id ? styles.blockSelected : ''}`}
                                        onClick={() => setSelected(block.id)}>
                                        <div className={styles.blockToolbar}>
                                            <span className={styles.blockLabel}>{block.type}</span>
                                            <div className={styles.blockTools}>
                                                <button onClick={(e) => {e.stopPropagation(); moveBlock(block.id, -1)}} disabled={idx===0}><MdArrowUpward /></button>
                                                <button onClick={(e) => {e.stopPropagation(); moveBlock(block.id, 1)}} disabled={idx===blocks.length-1}><MdArrowDownward /></button>
                                                <button onClick={(e) => {e.stopPropagation(); duplicateBlock(block.id)}}><MdContentCopy /></button>
                                                <button onClick={(e) => {e.stopPropagation(); removeBlock(block.id)}} className={styles.delBtn}><MdDelete /></button>
                                            </div>
                                        </div>
                                        <div className={styles.blockPreview} dangerouslySetInnerHTML={{__html: generateBlockPreview(block)}} />
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Properties */}
                <div className={styles.properties}>
                    <h3 className={styles.paletteTitle}>Properties</h3>
                    {selectedBlock ? (
                        <BlockEditor block={selectedBlock} onChange={(data) => updateBlock(selectedBlock.id, data)} />
                    ) : (
                        <p className={styles.noSelection}>Select a block to edit its properties</p>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

function generateBlockPreview(block) {
    switch(block.type) {
        case 'heading': return `<${block.data.level} style="text-align:${block.data.align};margin:0;font-size:${block.data.level==='h1'?'24px':'18px'}">${block.data.text}</${block.data.level}>`;
        case 'text': return `<p style="text-align:${block.data.align};margin:0;font-size:14px;color:#374151">${block.data.text}</p>`;
        case 'image': {
            const width = block.data.width || '100%';
            const height = block.data.height || 'auto';
            const radius = block.data.radius || '6px';
            const align = block.data.align || 'center';
            const padding = block.data.padding || '12px';
            const background = block.data.background || '#ffffff';
            return `<div style="text-align:${align};background:${background};padding:${padding}"><img src="${block.data.src}" alt="${block.data.alt}" style="max-width:100%;width:${width};height:${height};border-radius:${radius};" /></div>`;
        }
        case 'button': return `<div style="text-align:${block.data.align}"><span style="display:inline-block;padding:10px 24px;background:${block.data.color};color:${block.data.textColor};border-radius:6px;font-weight:600;font-size:13px">${block.data.text}</span></div>`;
        case 'divider': return `<hr style="border:none;border-top:1px ${block.data.style} ${block.data.color}" />`;
        case 'social': return `<div style="text-align:center;font-size:12px;color:#6b7280;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap">${block.data.links.map(l => { const c = SOCIAL_PLATFORMS.find(p=>p.name.toLowerCase()===l.platform.toLowerCase())?.color||'#6b7280'; return `<span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:${c};color:#fff;font-weight:700;font-size:12px" title="${l.platform}">${l.platform.charAt(0)}</span>`; }).join('')}</div>`;
        case 'footer': return `<div style="text-align:center;font-size:11px;color:#9ca3af">${block.data.text}</div>`;
        default: return '';
    }
}

function BlockEditor({ block, onChange }) {
    const s = { display:'flex',flexDirection:'column',gap:'12px' };
    const inputStyle = { width:'100%',padding:'8px 10px',border:'1px solid #d1d5db',borderRadius:'6px',fontSize:'0.85rem' };
    const labelStyle = { fontSize:'0.75rem',fontWeight:600,color:'#6b7280',marginBottom:'2px' };

    switch(block.type) {
        case 'heading':
            return <div style={s}>
                <div><label style={labelStyle}>Text</label><input style={inputStyle} value={block.data.text} onChange={e=>onChange({text:e.target.value})} /></div>
                <div><label style={labelStyle}>Level</label><select style={inputStyle} value={block.data.level} onChange={e=>onChange({level:e.target.value})}><option value="h1">H1</option><option value="h2">H2</option><option value="h3">H3</option></select></div>
                <div><label style={labelStyle}>Align</label><select style={inputStyle} value={block.data.align} onChange={e=>onChange({align:e.target.value})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
            </div>;
        case 'text':
            return <div style={s}>
                <div><label style={labelStyle}>Content</label><textarea style={{...inputStyle,minHeight:'100px',resize:'vertical'}} value={block.data.text} onChange={e=>onChange({text:e.target.value})} /></div>
                <div><label style={labelStyle}>Align</label><select style={inputStyle} value={block.data.align} onChange={e=>onChange({align:e.target.value})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
            </div>;
        case 'image':
            return <div style={s}>
                <div>
                    <label style={labelStyle}>Image Upload</label>
                    <div 
                        style={{
                            border:'2px dashed #d1d5db', borderRadius:'6px', padding:'16px', 
                            textAlign:'center', background:'#f9fafb', cursor:'pointer',
                            fontSize:'0.85rem', color:'#6b7280', transition:'all 0.2s', position: 'relative'
                        }}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#f9fafb'; }}
                        onDrop={async (e) => {
                            e.preventDefault();
                            e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#f9fafb';
                            const file = e.dataTransfer.files[0];
                            if (!file || !file.type.startsWith('image/')) return alert('Please drop an image file');
                            try {
                                const res = await api.uploadTemplateImage(file);
                                onChange({src: res.url});
                            } catch (err) { alert('Upload failed: ' + err.message); }
                        }}
                    >
                        Drop image here or click to upload
                        <input 
                            type="file" 
                            accept="image/*"
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                try {
                                    const res = await api.uploadTemplateImage(file);
                                    onChange({src: res.url});
                                } catch (err) { alert('Upload failed: ' + err.message); }
                            }}
                        />
                    </div>
                </div>
                <div><label style={labelStyle}>Or Image URL</label><input style={inputStyle} value={block.data.src} onChange={e=>onChange({src:e.target.value})} placeholder="https://..." /></div>
                <div><label style={labelStyle}>Alt Text</label><input style={inputStyle} value={block.data.alt} onChange={e=>onChange({alt:e.target.value})} /></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                    <div><label style={labelStyle}>Width</label><input style={inputStyle} value={block.data.width} onChange={e=>onChange({width:e.target.value})} placeholder="100% or 320px" /></div>
                    <div><label style={labelStyle}>Height</label><input style={inputStyle} value={block.data.height} onChange={e=>onChange({height:e.target.value})} placeholder="auto or 240px" /></div>
                </div>
                <div><label style={labelStyle}>Alignment</label><select style={inputStyle} value={block.data.align} onChange={e=>onChange({align:e.target.value})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px'}}>
                    <div><label style={labelStyle}>Padding</label><input style={inputStyle} value={block.data.padding} onChange={e=>onChange({padding:e.target.value})} placeholder="12px 24px" /></div>
                    <div><label style={labelStyle}>Margin</label><input style={inputStyle} value={block.data.margin} onChange={e=>onChange({margin:e.target.value})} placeholder="0 auto" /></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px',alignItems:'center'}}>
                    <div><label style={labelStyle}>Background</label><input type="color" value={block.data.background || '#ffffff'} onChange={e=>onChange({background:e.target.value})} style={{width:'100%',height:38,border:'1px solid #d1d5db',borderRadius:'6px'}} /></div>
                    <div><label style={labelStyle}>Border Radius</label><input style={inputStyle} value={block.data.radius || ''} onChange={e=>onChange({radius:e.target.value})} placeholder="8px" /></div>
                </div>
            </div>;
        case 'button':
            return <div style={s}>
                <div><label style={labelStyle}>Label</label><input style={inputStyle} value={block.data.text} onChange={e=>onChange({text:e.target.value})} /></div>
                <div><label style={labelStyle}>URL</label><input style={inputStyle} value={block.data.url} onChange={e=>onChange({url:e.target.value})} /></div>
                <div><label style={labelStyle}>Color</label><input type="color" value={block.data.color} onChange={e=>onChange({color:e.target.value})} style={{width:48,height:36,border:'none',cursor:'pointer'}} /></div>
                <div><label style={labelStyle}>Align</label><select style={inputStyle} value={block.data.align} onChange={e=>onChange({align:e.target.value})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
            </div>;
        case 'divider':
            return <div style={s}>
                <div><label style={labelStyle}>Style</label><select style={inputStyle} value={block.data.style} onChange={e=>onChange({style:e.target.value})}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></div>
                <div><label style={labelStyle}>Color</label><input type="color" value={block.data.color} onChange={e=>onChange({color:e.target.value})} style={{width:48,height:36,border:'none',cursor:'pointer'}} /></div>
            </div>;
        case 'social':
            return <div style={s}>
                <label style={labelStyle}>Social Media Links</label>
                {block.data.links.map((link, idx) => (
                    <div key={idx} style={{display:'flex',gap:'6px',alignItems:'center',background:'#f9fafb',padding:'8px',borderRadius:'6px',border:'1px solid #e5e7eb'}}>
                        <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:28,height:28,borderRadius:'50%',background:getSocialColor(link.platform),color:'#fff',fontSize:12,flexShrink:0}}>
                            {getSocialIcon(link.platform, 14)}
                        </span>
                        <select style={{...inputStyle,flex:'0 0 100px'}} value={link.platform} onChange={e => {
                            const updated = [...block.data.links];
                            updated[idx] = { ...updated[idx], platform: e.target.value };
                            onChange({ links: updated });
                        }}>
                            {SOCIAL_PLATFORMS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                        </select>
                        <input style={{...inputStyle,flex:1}} value={link.url} placeholder="https://..." onChange={e => {
                            const updated = [...block.data.links];
                            updated[idx] = { ...updated[idx], url: e.target.value };
                            onChange({ links: updated });
                        }} />
                        <button type="button" onClick={() => {
                            const updated = block.data.links.filter((_, i) => i !== idx);
                            onChange({ links: updated });
                        }} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',padding:4,display:'flex'}}><MdClose size={16}/></button>
                    </div>
                ))}
                <button type="button" onClick={() => {
                    const used = block.data.links.map(l => l.platform);
                    const next = SOCIAL_PLATFORMS.find(p => !used.includes(p.name));
                    onChange({ links: [...block.data.links, { platform: next?.name || 'Facebook', url: '#' }] });
                }} style={{display:'flex',alignItems:'center',gap:4,padding:'8px 12px',border:'1px dashed #d1d5db',borderRadius:'6px',background:'white',cursor:'pointer',fontSize:'0.8rem',color:'#6b7280',width:'100%',justifyContent:'center'}}>
                    <MdAdd size={16}/> Add Platform
                </button>
            </div>;
        case 'footer':
            return <div style={s}>
                <div><label style={labelStyle}>Footer Text</label><input style={inputStyle} value={block.data.text} onChange={e=>onChange({text:e.target.value})} /></div>
            </div>;
        default:
            return <p style={{fontSize:'0.85rem',color:'#9ca3af'}}>No editable properties</p>;
    }
}

export default function TemplateBuilderPage() {
    return (
        <Suspense fallback={<div style={{padding:'4rem',textAlign:'center'}}>Loading...</div>}>
            <BuilderContent />
        </Suspense>
    );
}

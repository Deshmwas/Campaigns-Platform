'use client';

import { useState, useRef } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import api from '../../../lib/api';
import styles from './import.module.css';
import { MdCloudUpload, MdCheck, MdWarning, MdPeople } from 'react-icons/md';

export default function ImportContactsPage() {
    const [step, setStep] = useState(1); // 1: upload, 2: mapping, 3: progress, 4: done
    const [file, setFile] = useState(null);
    const [csvData, setCsvData] = useState(null);
    const [columns, setColumns] = useState([]);
    const [mapping, setMapping] = useState({});
    const [lists, setLists] = useState([]);
    const [selectedList, setSelectedList] = useState('');
    const [result, setResult] = useState(null);
    const [importing, setImporting] = useState(false);
    const fileRef = useRef();

    const FIELDS = ['email', 'firstName', 'lastName', 'phone', 'company'];

    useState(() => {
        api.getLists().then(d => setLists(d || [])).catch(() => {});
    }, []);

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setFile(f);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) { alert('CSV must have headers + data'); return; }
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            setColumns(headers);
            // Auto-map columns
            const autoMap = {};
            headers.forEach((h, i) => {
                const lower = h.toLowerCase();
                if (lower.includes('email')) autoMap[i] = 'email';
                else if (lower.includes('first')) autoMap[i] = 'firstName';
                else if (lower.includes('last')) autoMap[i] = 'lastName';
                else if (lower.includes('phone')) autoMap[i] = 'phone';
                else if (lower.includes('company') || lower.includes('org')) autoMap[i] = 'company';
            });
            setMapping(autoMap);

            // Parse first 5 rows for preview
            const rows = lines.slice(1, 6).map(l => l.split(',').map(c => c.trim().replace(/"/g, '')));
            setCsvData({ headers, rows, totalRows: lines.length - 1 });
            setStep(2);
        };
        reader.readAsText(f);
    };

    const handleImport = async () => {
        if (!selectedList) { alert('Please select a target list'); return; }
        setImporting(true); setStep(3);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('listId', selectedList);
            formData.append('mapping', JSON.stringify(mapping));
            const res = await api.importContactsCSV(formData);
            setResult(res);
            setStep(4);
        } catch (err) {
            setResult({ error: err.message });
            setStep(4);
        } finally { setImporting(false); }
    };

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <h1 className={styles.title}>Import Contacts</h1>
                <p className={styles.subtitle}>Upload a CSV file to import contacts into a list</p>

                {/* Progress Steps */}
                <div className={styles.steps}>
                    {['Upload', 'Map Columns', 'Import', 'Done'].map((s, i) => (
                        <div key={s} className={`${styles.step} ${step > i ? styles.stepDone : ''} ${step === i+1 ? styles.stepActive : ''}`}>
                            <div className={styles.stepDot}>{step > i+1 ? <MdCheck /> : i+1}</div>
                            <span>{s}</span>
                        </div>
                    ))}
                </div>

                <Card>
                    {step === 1 && (
                        <div className={styles.uploadArea} onClick={() => fileRef.current?.click()}>
                            <MdCloudUpload className={styles.uploadIcon} />
                            <h3>Drag & drop your CSV file here</h3>
                            <p>or click to browse files</p>
                            <p className={styles.hint}>Supported: .csv files with headers</p>
                            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} hidden />
                        </div>
                    )}

                    {step === 2 && csvData && (
                        <div className={styles.mappingSection}>
                            <div className={styles.mappingHeader}>
                                <h3>Map CSV columns to contact fields</h3>
                                <p>{csvData.totalRows} contacts found</p>
                            </div>

                            <div className={styles.selectGroup}>
                                <label>Target List</label>
                                <select value={selectedList} onChange={e => setSelectedList(e.target.value)}>
                                    <option value="">Select a list...</option>
                                    {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>

                            <table className={styles.mapTable}>
                                <thead>
                                    <tr>
                                        <th>CSV Column</th>
                                        <th>Maps To</th>
                                        <th>Preview</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {columns.map((col, i) => (
                                        <tr key={i}>
                                            <td className={styles.colName}>{col}</td>
                                            <td>
                                                <select value={mapping[i] || ''} onChange={e => setMapping({...mapping, [i]: e.target.value})} className={styles.mapSelect}>
                                                    <option value="">Skip</option>
                                                    {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                                                </select>
                                            </td>
                                            <td className={styles.previewCell}>{csvData.rows[0]?.[i] || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className={styles.importActions}>
                                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                                <Button onClick={handleImport} disabled={!selectedList}>Start Import</Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className={styles.progressSection}>
                            <div className={styles.spinner}></div>
                            <h3>Importing contacts...</h3>
                            <p>This may take a moment</p>
                        </div>
                    )}

                    {step === 4 && (
                        <div className={styles.resultSection}>
                            {result?.error ? (
                                <>
                                    <MdWarning className={styles.resultIconFail} />
                                    <h3>Import Failed</h3>
                                    <p>{result.error}</p>
                                </>
                            ) : (
                                <>
                                    <MdPeople className={styles.resultIconSuccess} />
                                    <h3>Import Complete!</h3>
                                    <p>{result?.imported || 0} contacts imported, {result?.duplicates || 0} duplicates skipped</p>
                                </>
                            )}
                            <Button onClick={() => { setStep(1); setFile(null); setCsvData(null); setResult(null); }}>
                                Import More
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
}

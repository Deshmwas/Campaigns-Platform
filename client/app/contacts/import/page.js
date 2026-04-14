'use client';

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
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
    const [allRows, setAllRows] = useState([]);
    const fileRef = useRef();

    const FIELDS = ['email', 'firstName', 'lastName', 'phone', 'company'];

    useEffect(() => {
        api.getLists().then(d => setLists(d || [])).catch(() => {});
    }, []);

    const processData = (headers, rows) => {
        setAllRows(rows);
        setColumns(headers);
        
        const autoMap = {};
        headers.forEach((h, i) => {
            const lower = String(h).toLowerCase();
            if (lower.includes('email')) autoMap[i] = 'email';
            else if (lower.includes('first')) autoMap[i] = 'firstName';
            else if (lower.includes('last')) autoMap[i] = 'lastName';
            else if (lower.includes('phone')) autoMap[i] = 'phone';
            else if (lower.includes('company') || lower.includes('org')) autoMap[i] = 'company';
        });
        setMapping(autoMap);

        setCsvData({ 
            headers, 
            rows: rows.slice(0, 5), 
            totalRows: rows.length 
        });
        setStep(2);
    };

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setFile(f);

        const reader = new FileReader();
        const extension = f.name.split('.').pop().toLowerCase();

        if (extension === 'csv') {
            reader.onload = (ev) => {
                const text = ev.target.result;
                const lines = text.split('\n').map(l => l.trim()).filter(l => l);
                if (lines.length < 2) { alert('CSV must have headers + data'); return; }
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                const rows = lines.slice(1).map(l => l.split(',').map(c => c.trim().replace(/"/g, '')));
                processData(headers, rows);
            };
            reader.readAsText(f);
        } else if (['xlsx', 'xls'].includes(extension)) {
            reader.onload = (ev) => {
                const data = new Uint8Array(ev.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length < 2) { alert('Excel file must have headers + data'); return; }
                const headers = jsonData[0];
                const rows = jsonData.slice(1);
                processData(headers, rows);
            };
            reader.readAsArrayBuffer(f);
        } else {
            alert('Unsupported file format');
        }
    };

    const handleImport = async () => {
        if (!selectedList) { alert('Please select a target list'); return; }
        
        // Check if at least email or phone is mapped
        const mappedFields = Object.values(mapping);
        if (!mappedFields.includes('email') && !mappedFields.includes('phone')) {
            alert('You must map at least Email or Phone column');
            return;
        }

        setImporting(true); 
        setStep(3);

        const contacts = allRows.map(row => {
            const contact = {};
            Object.keys(mapping).forEach(colIndex => {
                const fieldName = mapping[colIndex];
                if (fieldName) {
                    contact[fieldName] = row[colIndex];
                }
            });
            return contact;
        }).filter(c => c.email || c.phone);

        try {
            const res = await api.importContacts(contacts, selectedList);
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
                <p className={styles.subtitle}>Upload a file to import contacts into a list</p>

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
                            <h3>Click or drag a file here</h3>
                            <p>Supported formats: .csv, .xlsx, .xls</p>
                            <p className={styles.hint}>Files should have headers in the first row</p>
                            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} hidden />
                        </div>
                    )}

                    {step === 2 && csvData && (
                        <div className={styles.mappingSection}>
                            <div className={styles.mappingHeader}>
                                <h3>Map columns to contact fields</h3>
                                <p>{csvData.totalRows} contacts found</p>
                            </div>

                            <div className={styles.selectGroup}>
                                <label>Target List</label>
                                <select value={selectedList} onChange={e => setSelectedList(e.target.value)} required>
                                    <option value="">Select a list...</option>
                                    {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>

                            <div className={styles.tableWrapper}>
                                <table className={styles.mapTable}>
                                    <thead>
                                        <tr>
                                            <th>File Column</th>
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
                                                <td className={styles.previewCell}>{String(csvData.rows[0]?.[i] || '-')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className={styles.importActions}>
                                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                                <Button onClick={handleImport}>Start Import</Button>
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
                                    <div className={styles.statGrid}>
                                        <div className={styles.statItem}>
                                            <strong>{result?.imported || 0}</strong>
                                            <span>Imported</span>
                                        </div>
                                        <div className={styles.statItem}>
                                            <strong>{result?.skipped || 0}</strong>
                                            <span>Skipped (Duplicates)</span>
                                        </div>
                                        <div className={styles.statItem}>
                                            <strong>{result?.failed || 0}</strong>
                                            <span>Failed</span>
                                        </div>
                                    </div>
                                    
                                    {result?.skippedDetails?.length > 0 && (
                                        <div className={styles.detailsBox}>
                                            <h4>Skipped Contacts (Already in system):</h4>
                                            <ul>
                                                {result.skippedDetails.map((s, i) => (
                                                    <li key={i}>{s.email}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
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

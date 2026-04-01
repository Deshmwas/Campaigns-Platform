 'use client';

import { useState } from 'react';
import styles from './Input.module.css';

export default function Input({
    label,
    error,
    type = 'text',
    className = '',
    toggleVisibility = false,
    ...props
}) {
    const [show, setShow] = useState(false);
    const inputType = toggleVisibility && type === 'password' ? (show ? 'text' : 'password') : type;
    const inputClass = `${styles.input} ${error ? styles.error : ''} ${toggleVisibility && type === 'password' ? styles.withToggle : ''} ${className}`;

    return (
        <div className={styles.inputGroup}>
            {label && <label className={styles.label}>{label}</label>}
            <input
                type={inputType}
                className={inputClass}
                {...props}
            />
            {toggleVisibility && type === 'password' && (
                <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={() => setShow(!show)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                >
                    {show ? '🙈' : '👁️'}
                </button>
            )}
            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
}

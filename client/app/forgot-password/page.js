'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import styles from '../login/auth.module.css';
import { useBranding } from '../../lib/useBranding';

export default function ForgotPasswordPage() {
    const { name: brandName, logoUrl, initials } = useBranding();
    const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            await api.forgotPassword(email);
            setSuccess('If the email exists, an OTP has been sent. Check your inbox (or server console in dev mode).');
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    const handleVerifyAndReset = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            await api.resetPassword(email, otp, newPassword);
            setSuccess('Password reset successfully! Redirecting to login...');
            setStep(3);
            setTimeout(() => { window.location.href = '/login'; }, 2000);
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    return (
        <div className={styles.container}>
            <div className={styles.bgOrbs}>
                <div className={styles.orb1}></div>
                <div className={styles.orb2}></div>
            </div>
            <div className={styles.brandCorner}>
                <div className={styles.brandMark}>
                    {logoUrl ? <img src={logoUrl} alt={`${brandName} logo`} /> : <span>{initials}</span>}
                </div>
                <div className={styles.brandText}>
                    <strong>{brandName}</strong>
                    <span>Campaigns Platform</span>
                </div>
            </div>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        {logoUrl ? <img src={logoUrl} alt={`${brandName} logo`} /> : initials}
                    </div>
                    <h1 className={styles.title}>Reset Password</h1>
                    <p className={styles.subtitle}>
                        {step === 1 && 'Enter your email to receive an OTP'}
                        {step === 2 && 'Enter the OTP and your new password'}
                        {step === 3 && 'Password reset complete!'}
                    </p>
                </div>

                {error && <div className={styles.error}>{error}</div>}
                {success && <div style={{
                    background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)',
                    color: '#86efac', padding: '12px 16px', borderRadius: '0.625rem',
                    fontSize: '0.875rem', marginBottom: '0.5rem'
                }}>{success}</div>}

                {step === 1 && (
                    <form onSubmit={handleSendOTP} className={styles.form}>
                        <Input label="Email Address" type="email" value={email}
                            onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
                        <Button type="submit" loading={loading} className={styles.submitButton}>
                            Send OTP
                        </Button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyAndReset} className={styles.form}>
                        <Input label="OTP Code" type="text" value={otp}
                            onChange={(e) => setOtp(e.target.value)} required placeholder="123456" />
                        <Input label="New Password" type="password" value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)} required placeholder="********" />
                        <Input label="Confirm Password" type="password" value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="********" />
                        <Button type="submit" loading={loading} className={styles.submitButton}>
                            Reset Password
                        </Button>
                    </form>
                )}

                <div className={styles.footer}>
                    <Link href="/login" className={styles.link}>Back to Login</Link>
                </div>
            </div>
        </div>
    );
}

'use client';
export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import styles from './auth.module.css';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { useBranding } from '../../lib/useBranding';
import api from '../../lib/api';

function LoginContent() {
    const { login } = useAuth();
    const { name: brandName, logoUrl, initials } = useBranding();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login({ email, password });
            window.location.href = '/dashboard';
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const hasLogo = !!logoUrl;

    return (
        <div className={styles.container}>
            <div className={styles.bgOrbs}>
                <div className={styles.orb1}></div>
                <div className={styles.orb2}></div>
                <div className={styles.orb3}></div>
            </div>
            <div className={styles.brandCorner}>
                <div className={styles.brandMark} style={hasLogo ? { background: 'transparent', border: 'none', boxShadow: 'none' } : {}}>
                    {logoUrl ? <img src={api.ensureAbsoluteUrl(logoUrl)} alt={`${brandName} logo`} /> : <span>{initials}</span>}
                </div>
                <div className={styles.brandText}>
                    <strong>{brandName}</strong>
                    <span>Campaigns Platform</span>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo} style={hasLogo ? { background: 'transparent', boxShadow: 'none' } : {}}>
                        {logoUrl ? <img src={api.ensureAbsoluteUrl(logoUrl)} alt={`${brandName} logo`} /> : initials}
                    </div>
                    <h1 className={styles.title}>{brandName}</h1>
                    <p className={styles.subtitle}>Sign in to your account</p>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                    />

                    <div className={styles.passwordField}>
                        <Input
                            label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="********"
                    />
                        <button
                            type="button"
                            className={styles.eyeButton}
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                        </button>
                    </div>

                    <div className={styles.forgotRow}>
                        <Link href="/forgot-password" className={styles.forgotLink}>
                            Forgot password?
                        </Link>
                    </div>

                    <Button type="submit" loading={loading} className={styles.submitButton}>
                        Sign in
                    </Button>
                </form>

                <div className={styles.footer}>
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className={styles.link}>
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className={styles.container} />}>
            <LoginContent />
        </Suspense>
    );
}

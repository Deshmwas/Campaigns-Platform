'use client';
export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import styles from '../login/auth.module.css';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { useBranding } from '../../lib/useBranding';
import api from '../../lib/api';

function RegisterContent() {
    const { register } = useAuth();
    const { name: brandName, logoUrl, initials } = useBranding();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        organizationName: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate password length
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await register({
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName,
                organizationName: formData.organizationName,
            });
            window.location.href = '/dashboard';
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const passwordsMatch = formData.confirmPassword.length === 0 || formData.password === formData.confirmPassword;

    return (
        <div className={styles.container}>
            <div className={styles.bgOrbs}>
                <div className={styles.orb1}></div>
                <div className={styles.orb2}></div>
                <div className={styles.orb3}></div>
            </div>
            <div className={styles.brandCorner}>
                <div className={styles.brandMark}>
                    {logoUrl ? <img src={api.ensureAbsoluteUrl(logoUrl)} alt={`${brandName} logo`} /> : <span>{initials}</span>}
                </div>
                <div className={styles.brandText}>
                    <strong>{brandName}</strong>
                    <span>Campaigns Platform</span>
                </div>
            </div>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        {logoUrl ? <img src={api.ensureAbsoluteUrl(logoUrl)} alt={`${brandName} logo`} /> : initials}
                    </div>
                    <h1 className={styles.title}>Get Started</h1>
                    <p className={styles.subtitle}>Create your organization account</p>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <Input
                        label="Organization Name"
                        name="organizationName"
                        value={formData.organizationName}
                        onChange={handleChange}
                        required
                        placeholder="Acme Inc"
                    />

                    <div className={styles.row}>
                        <Input
                            label="First Name"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            placeholder="John"
                        />

                        <Input
                            label="Last Name"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                            placeholder="Doe"
                        />
                    </div>

                    <Input
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="john@acme.com"
                    />

                    <div className={styles.passwordField}>
                        <Input
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
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
                    {formData.password.length > 0 && formData.password.length < 6 && (
                        <p style={{fontSize:'0.75rem',color:'#f59e0b',margin:'-8px 0 0 0'}}>
                            ⚠ Password must be at least 6 characters
                        </p>
                    )}

                    <div className={styles.passwordField}>
                        <Input
                        label="Confirm Password"
                        type={showConfirm ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        placeholder="********"
                    />
                        <button
                            type="button"
                            className={styles.eyeButton}
                            onClick={() => setShowConfirm(!showConfirm)}
                            tabIndex={-1}
                        >
                            {showConfirm ? <MdVisibilityOff /> : <MdVisibility />}
                        </button>
                    </div>
                    {!passwordsMatch && (
                        <p style={{fontSize:'0.75rem',color:'#ef4444',margin:'-8px 0 0 0'}}>
                            ✗ Passwords do not match
                        </p>
                    )}
                    {passwordsMatch && formData.confirmPassword.length > 0 && (
                        <p style={{fontSize:'0.75rem',color:'#22c55e',margin:'-8px 0 0 0'}}>
                            ✓ Passwords match
                        </p>
                    )}

                    <Button type="submit" loading={loading} className={styles.submitButton}>
                        Create account
                    </Button>
                </form>

                <div className={styles.footer}>
                    Already have an account?{' '}
                    <Link href="/login" className={styles.link}>
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className={styles.container} />}>
            <RegisterContent />
        </Suspense>
    );
}

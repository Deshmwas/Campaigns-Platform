'use client';

import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (user) {
                window.location.href = '/dashboard';
            } else {
                window.location.href = '/login';
            }
        }
    }, [user, loading]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div style={{ textAlign: 'center' }}>
                <h1>Campaigns</h1>
                <p>Loading...</p>
            </div>
        </div>
    );
}

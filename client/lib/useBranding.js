'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from './api';

const computeInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/).slice(0, 3);
    return parts.map(p => p[0].toUpperCase()).join('');
};

export function useBranding() {
    const searchParams = useSearchParams();
    const queryCompanyId = searchParams.get('companyId');
    const [resolvedCompanyId, setResolvedCompanyId] = useState(queryCompanyId || null);

    const [branding, setBranding] = useState({
        name: 'Campaigns',
        logoUrl: null,
        companyId: queryCompanyId || null,
    });

    useEffect(() => {
        if (queryCompanyId) {
            setResolvedCompanyId(queryCompanyId);
            return;
        }

        if (typeof window !== 'undefined') {
            const cachedCompanyId = localStorage.getItem('lastCompanyId');
            if (cachedCompanyId) {
                setResolvedCompanyId(cachedCompanyId);
            }
        }
    }, [queryCompanyId]);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const data = await api.getBranding(resolvedCompanyId || undefined);
                if (isMounted && data) {
                    setBranding({
                        name: data.name || 'Campaigns',
                        logoUrl: api.ensureAbsoluteUrl(data.logoUrl) || null,
                        companyId: data.companyId || resolvedCompanyId || null,
                    });
                }
            } catch (err) {
                // Keep defaults silently to avoid blocking login
                console.warn('Branding load failed', err);
            }
        })();

        return () => { isMounted = false; };
    }, [resolvedCompanyId]);

    return {
        ...branding,
        initials: computeInitials(branding.name),
    };
}

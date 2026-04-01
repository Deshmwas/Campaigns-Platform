'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

const DEFAULT_COLORS = {
    primary: '#dc2626',
    primaryDark: '#991b1b',
    primaryLight: '#f87171',
    secondary: '#000000',
    secondaryLight: '#1f1f1f',
    secondaryLighter: '#2a2a2a',
    accent: '#16a34a',
    accentDark: '#15803d',
    accentLight: '#22c55e',
};

// Preset themes
const PRESETS = [
    { name: 'Default (Red)', primary: '#dc2626', secondary: '#000000', accent: '#16a34a' },
    { name: 'Ocean Blue', primary: '#2563eb', secondary: '#0f172a', accent: '#06b6d4' },
    { name: 'Purple Haze', primary: '#7c3aed', secondary: '#1e1b4b', accent: '#f59e0b' },
    { name: 'Sunset Orange', primary: '#ea580c', secondary: '#1c1917', accent: '#84cc16' },
    { name: 'Emerald', primary: '#059669', secondary: '#064e3b', accent: '#f43f5e' },
    { name: 'Rose', primary: '#e11d48', secondary: '#1f2937', accent: '#8b5cf6' },
];

function hexToHSL(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function adjustColor(hex, lightnessOffset) {
    const hsl = hexToHSL(hex);
    const newL = Math.min(100, Math.max(0, hsl.l + lightnessOffset));
    return `hsl(${hsl.h}, ${hsl.s}%, ${newL}%)`;
}

function hexToRGB(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

export function ThemeProvider({ children }) {
    const [colors, setColors] = useState(DEFAULT_COLORS);
    const [mounted, setMounted] = useState(false);

    // Load saved colors from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('campaignsTheme');
            if (saved) {
                const parsed = JSON.parse(saved);
                setColors({ ...DEFAULT_COLORS, ...parsed });
            }
        } catch (e) {
            // ignore parse errors
        }
        setMounted(true);
    }, []);

    // Apply CSS variables whenever colors change
    useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;

        root.style.setProperty('--color-primary', colors.primary);
        root.style.setProperty('--color-primary-dark', colors.primaryDark);
        root.style.setProperty('--color-primary-light', colors.primaryLight);
        root.style.setProperty('--color-secondary', colors.secondary);
        root.style.setProperty('--color-secondary-light', colors.secondaryLight);
        root.style.setProperty('--color-secondary-lighter', colors.secondaryLighter);
        root.style.setProperty('--color-accent', colors.accent);
        root.style.setProperty('--color-accent-dark', colors.accentDark);
        root.style.setProperty('--color-accent-light', colors.accentLight);
        root.style.setProperty('--color-success', colors.accent);
        root.style.setProperty('--color-error', colors.primary);

        // Sidebar-specific vars
        root.style.setProperty('--sidebar-bg', colors.secondary);
        root.style.setProperty('--sidebar-text', adjustColor(colors.secondary, 45));

        // Dynamic glow shadow based on primary
        const hsl = hexToHSL(colors.primary);
        root.style.setProperty('--shadow-glow', `rgba(${hexToRGB(colors.primary)}, 0.3)`);
    }, [colors, mounted]);

    const updateColors = useCallback((newColors) => {
        // Auto-generate dark/light variants from the base colors
        const updated = {
            primary: newColors.primary || colors.primary,
            primaryDark: adjustColor(newColors.primary || colors.primary, -15),
            primaryLight: adjustColor(newColors.primary || colors.primary, 20),
            secondary: newColors.secondary || colors.secondary,
            secondaryLight: adjustColor(newColors.secondary || colors.secondary, 12),
            secondaryLighter: adjustColor(newColors.secondary || colors.secondary, 18),
            accent: newColors.accent || colors.accent,
            accentDark: adjustColor(newColors.accent || colors.accent, -10),
            accentLight: adjustColor(newColors.accent || colors.accent, 15),
        };

        setColors(updated);
        localStorage.setItem('campaignsTheme', JSON.stringify(updated));
    }, [colors]);

    const resetColors = useCallback(() => {
        setColors(DEFAULT_COLORS);
        localStorage.removeItem('campaignsTheme');
    }, []);

    return (
        <ThemeContext.Provider value={{ colors, updateColors, resetColors, presets: PRESETS }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}

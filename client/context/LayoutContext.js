'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const LayoutContext = createContext();

export function LayoutProvider({ children }) {
    const [layoutMode, setLayoutMode] = useState('sidebar'); // 'sidebar' | 'topbar'
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (typeof window !== 'undefined') {
            const savedLayout = localStorage.getItem('layoutMode');
            if (savedLayout === 'topbar' || savedLayout === 'sidebar') {
                setLayoutMode(savedLayout);
            }
            
            // Add keyboard shortcut Ctrl+B to toggle layout
            const handleKeyDown = (e) => {
                if (e.ctrlKey && e.key.toLowerCase() === 'b') {
                    e.preventDefault();
                    toggleLayout();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, []);

    const toggleLayout = () => {
        setLayoutMode((prev) => {
            const newMode = prev === 'sidebar' ? 'topbar' : 'sidebar';
            if (typeof window !== 'undefined') {
                localStorage.setItem('layoutMode', newMode);
            }
            return newMode;
        });
    };

    return (
        <LayoutContext.Provider value={{ layoutMode, isMounted, toggleLayout }}>
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayoutConfig() {
    return useContext(LayoutContext);
}

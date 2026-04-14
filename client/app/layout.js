'use client';

import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { LayoutProvider } from '../context/LayoutContext';
import '../styles/globals.css';

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <title>Campaigns - Email & SMS Platform</title>
                <meta name="description" content="Self-hosted campaigns management system" />
            </head>
            <body>
                <AuthProvider>
                    <LayoutProvider>
                        <ThemeProvider>
                            <ToastProvider>{children}</ToastProvider>
                        </ThemeProvider>
                    </LayoutProvider>
                </AuthProvider>
            </body>
        </html>
    );
}

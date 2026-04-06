import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import prisma from '../config/database.js';

class EmailEngine {
    constructor() {
        this.transporter = null;
        this.isReady = false;
        this.rateLimiter = {
            count: 0,
            resetAt: Date.now() + 60000,
        };
    }

    async initialize() {
            if (!config.smtp.host) {
                console.log('⚠️  SMTP_HOST not configured. Email engine will run in SIMULATED mode.');
                this.isReady = false;
                return;
            }
            try {
            this.transporter = nodemailer.createTransport({
                host: config.smtp.host,
                port: config.smtp.port,
                secure: config.smtp.secure,
                auth: config.smtp.auth,
                pool: true, // Enable connection pooling
                maxConnections: 5,
                maxMessages: 100,
            });

            await this.transporter.verify();
            this.isReady = true;
            console.log('✅ Email engine initialized successfully');
        } catch (error) {
            console.error('❌ Email engine initialization failed:', error.message);
            console.log('⚠️  Email sending will be simulated (logged only)');
            this.isReady = false;
        }
    }

    async canSend() {
        const now = Date.now();

        if (now > this.rateLimiter.resetAt) {
            this.rateLimiter.count = 0;
            this.rateLimiter.resetAt = now + 60000;
        }

        if (this.rateLimiter.count >= config.rateLimits.email) {
            const waitTime = this.rateLimiter.resetAt - now;
            return { allowed: false, waitTime };
        }

        return { allowed: true };
    }

    async send({ to, subject, html, text, campaignId, recipientId, senderConfig }) {
        // Rate limiting check
        const { allowed, waitTime } = await this.canSend();
        if (!allowed) {
            throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(waitTime / 1000)}s`);
        }

        // Normalize relative URLs to absolute URLs
        const normalizedHtml = this.normalizeUrls(html);
 
        // Add tracking pixel and link rewriting
        const trackedHtml = this.addTracking(normalizedHtml, recipientId);

        // Determine sender
        const fromName = senderConfig?.fromName || config.smtp.from.name;
        const fromEmail = senderConfig?.fromEmail || config.smtp.from.email;

        const mailOptions = {
            from: `${fromName} <${fromEmail}>`,
            to,
            subject,
            html: trackedHtml,
            text: text || this.htmlToText(html),
            headers: {
                'X-Campaign-ID': campaignId,
                'X-Recipient-ID': recipientId,
            },
        };

        try {
            // Use per-campaign sender transporter or default
            let activeTransporter = this.transporter;
            let closeAfter = false;

            // --- RESEND API SUPPORT ---
            if (!senderConfig && config.resendApiKey) {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.resendApiKey}`,
                    },
                    body: JSON.stringify({
                        from: `"${fromName}" <${fromEmail}>`,
                        to: Array.isArray(to) ? to : [to],
                        subject,
                        html: this.normalizeUrls(html),
                        text: text || this.htmlToText(html),
                    }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(`Resend API Error: ${data.message || response.statusText}`);
                }

                console.log(`📧 System Email sent via Resend API to ${to} - ID: ${data.id}`);
                return { success: true, messageId: data.id };
            }
            // ---------------------------

            if (senderConfig) {
                const nodemailer = (await import('nodemailer')).default;
                activeTransporter = nodemailer.createTransport({
                    host: senderConfig.host,
                    port: senderConfig.port,
                    secure: senderConfig.secure,
                    auth: senderConfig.auth,
                });
                closeAfter = true;
            }

            // --- RESEND API SUPPORT ---
            if (!senderConfig && config.resendApiKey) {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.resendApiKey}`,
                    },
                    body: JSON.stringify({
                        from: `${fromName} <${fromEmail}>`,
                        to: Array.isArray(to) ? to : [to],
                        subject,
                        html: trackedHtml,
                        text: text || this.htmlToText(html),
                    }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(`Resend API Error: ${data.message || response.statusText}`);
                }

                console.log(`📧 Email sent via Resend API to ${to} - ID: ${data.id}`);
                this.rateLimiter.count++;
                return { success: true, messageId: data.id, response: 'Sent via Resend' };
            }
            // ---------------------------

            if (senderConfig || this.isReady) {
                const info = await activeTransporter.sendMail(mailOptions);
                this.rateLimiter.count++;
                if (closeAfter) activeTransporter.close();

                console.log(`📧 Email sent to ${to} - Message ID: ${info.messageId}`);

                return {
                    success: true,
                    messageId: info.messageId,
                    response: info.response,
                };
            } else {
                // Simulation mode for development/testing
                console.log(`📧 [SIMULATED] Email to ${to}`);
                console.log(`   Subject: ${subject}`);
                console.log(`   Campaign: ${campaignId}`);

                return {
                    success: true,
                    messageId: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    response: 'Simulated send (SMTP not configured)',
                };
            }
        } catch (error) {
            console.error(`❌ Email send failed to ${to}:`, error.message);
            throw error;
        }
    }

    addTracking(html, recipientId) {
        if (!html) return html;

        // Add tracking pixel at the end
        const trackingPixel = `<img src="${config.tracking.domain}/api/track/open/${recipientId}" width="1" height="1" alt="" style="display:block;" />`;

        // Rewrite links to track clicks
        const trackedHtml = html.replace(
            /<a\s+([^>]*href=["']([^"']+)["'][^>]*)>/gi,
            (match, attrs, url) => {
                if (url.startsWith('mailto:') || url.startsWith('#')) {
                    return match; // Don't track mailto or anchor links
                }
                const trackedUrl = `${config.tracking.domain}/api/track/click/${recipientId}?url=${encodeURIComponent(url)}`;
                return `<a ${attrs.replace(url, trackedUrl)}>`;
            }
        );

        return trackedHtml + trackingPixel;
    }
 
    normalizeUrls(html) {
        if (!html) return html;
 
        const baseUrl = config.app.apiUrl.endsWith('/') 
            ? config.app.apiUrl.slice(0, -1) 
            : config.app.apiUrl;
 
        // Regex to find src="..." and href="..." starting with "/"
        // It looks for src="/..." or href="/..." and replaces it with baseUrl + "/..."
        // Also handles single quotes
        return html.replace(
            /(src|href)=["']\/([^"']+)["']/gi,
            (match, attr, path) => `${attr}="${baseUrl}/${path}"`
        );
    }

    htmlToText(html) {
        // Simple HTML to text conversion
        return html
            .replace(/<style[^>]*>.*<\/style>/gms, '')
            .replace(/<script[^>]*>.*<\/script>/gms, '')
            .replace(/<[^>]+>/gm, '')
            .replace(/\s\s+/g, ' ')
            .trim();
    }

    async sendSystemEmail({ to, subject, html, text, senderConfig }) {
        if (!this.isReady && config.nodeEnv === 'production') {
            console.warn('⚠️ SMTP not ready, system email will be simulated');
        }

        const fromName = senderConfig?.fromName || config.smtp.from.name;
        const fromEmail = senderConfig?.fromEmail || config.smtp.from.email;

        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject,
            html: this.normalizeUrls(html),
            text: text || this.htmlToText(html),
        };

        try {
            // Allow per-request senderConfig (used for organization-specific senders)
            if (senderConfig) {
                const nodemailer = (await import('nodemailer')).default;
                const tempTransporter = nodemailer.createTransport({
                    host: senderConfig.host,
                    port: senderConfig.port,
                    secure: senderConfig.secure,
                    auth: senderConfig.auth,
                });
                const info = await tempTransporter.sendMail(mailOptions);
                tempTransporter.close();
                console.log(`📧 System Email sent via senderConfig to ${to} - Message ID: ${info.messageId}`);
                return { success: true, messageId: info.messageId };
            }

            if (this.isReady) {
                const info = await this.transporter.sendMail(mailOptions);
                console.log(`📧 System Email sent to ${to} - Message ID: ${info.messageId}`);
                return { success: true, messageId: info.messageId };
            } else {
                console.log(`📧 [SIMULATED SYSTEM EMAIL] to ${to}`);
                console.log(`   Subject: ${subject}`);
                return { success: true, messageId: `sys-${Date.now()}` };
            }
        } catch (error) {
            console.error(`❌ System Email failed to ${to}:`, error.message);
            throw error;
        }
    }

    async close() {
        if (this.transporter) {
            this.transporter.close();
            console.log('Email engine closed');
        }
    }
}

export default new EmailEngine();

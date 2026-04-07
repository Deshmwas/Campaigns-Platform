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
                pool: true,
                maxConnections: 5,
                maxMessages: 100,
                connectionTimeout: 5000, // 5 second connection timeout
            });

            // --- NON-BLOCKING VERIFICATION WITH TIMEOUT ---
            // On Render, this often hangs forever because ports are blocked.
            // We wrap it in a 5sec race to ensure the server finishes booting.
            console.log('📡 Verifying SMTP connection (5s timeout)...');
            const verifyPromise = this.transporter.verify();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('SMTP Verification Timeout')), 5000)
            );

            await Promise.race([verifyPromise, timeoutPromise]);
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
        const { allowed, waitTime } = await this.canSend();
        if (!allowed) throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(waitTime / 1000)}s`);

        const normalizedHtml = this.normalizeUrls(html);
        const trackedHtml = this.addTracking(normalizedHtml, recipientId);
        const fromName = senderConfig?.fromName || config.smtp.from.name;
        const fromEmail = senderConfig?.fromEmail || config.smtp.from.email;

        try {
            let activeTransporter = this.transporter;
            let closeAfter = false;

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

            if (senderConfig || this.isReady) {
                try {
                    const info = await activeTransporter.sendMail(mailOptions);
                    this.rateLimiter.count++;
                    if (closeAfter) activeTransporter.close();
                    console.log(`📧 Email sent to ${to} - Message ID: ${info.messageId}`);
                    return { success: true, messageId: info.messageId, response: info.response };
                } catch (smtpError) {
                    // --- FALLBACK TO RESEND ON TIMEOUT OR UNAVAILABLE ---
                    const isTimeout = smtpError.code === 'ETIMEDOUT' || 
                                    smtpError.code === 'ECONNREFUSED' || 
                                    smtpError.code === 'ECONNABORTED' || 
                                    /timeout/i.test(smtpError.message);

                    if (config.resendApiKey && isTimeout) {
                        console.warn(`⚠️ SMTP Timeout for ${to}. Falling back to Resend API...`);
                        return await this.sendViaResend({ fromName, fromEmail, to, subject, html: trackedHtml, text });
                    }
                    throw smtpError;
                }
            } else if (config.resendApiKey) {
                return await this.sendViaResend({ fromName, fromEmail, to, subject, html: trackedHtml, text });
            } else {
                console.log(`📧 [SIMULATED] Email to ${to}`);
                return { success: true, messageId: `sim-${Date.now()}`, response: 'Simulated' };
            }
        } catch (error) {
            console.error(`❌ Email send failed to ${to}:`, error.message);
            throw error;
        }
    }

    async sendViaResend({ fromName, fromEmail, to, subject, html, text }) {
        // Fallback to verified domain if using a public domain OR if custom domain verification fails
        const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
        const domain = fromEmail.split('@')[1];
        
        let finalFrom = publicDomains.includes(domain?.toLowerCase()) 
            ? `${fromName} <${config.resendDefaultFrom}>`
            : `${fromName} <${fromEmail}>`;

        const sendRequest = async (from) => {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.resendApiKey}`,
                },
                body: JSON.stringify({
                    from,
                    to: Array.isArray(to) ? to : [to],
                    subject,
                    html,
                    text: text || this.htmlToText(html),
                }),
            });
            return { ok: response.ok, status: response.status, data: await response.json() };
        };

        console.log(`🚀 Attempting Resend API send to ${to} (from: ${finalFrom})...`);
        let result = await sendRequest(finalFrom);

        // If first attempt fails because of domain verification, fallback to default sender
        if (!result.ok && result.data?.message?.toLowerCase().includes('not verified')) {
            console.warn(`⚠️ Domain ${domain} not verified on Resend. Falling back to default sender ${config.resendDefaultFrom}...`);
            finalFrom = `${fromName} <${config.resendDefaultFrom}>`;
            result = await sendRequest(finalFrom);
        }

        if (result.ok) {
            console.log(`📧 Email successfully sent via Resend API to ${to} - ID: ${result.data.id}`);
            this.rateLimiter.count++;
            return { success: true, messageId: result.data.id, response: 'Sent via Resend' };
        } else {
            const errorMsg = result.data?.message || `HTTP ${result.status}`;
            console.error(`❌ Resend API Error: ${errorMsg}`);
            throw new Error(`Resend API Error: ${errorMsg}`);
        }
    }

    addTracking(html, recipientId) {
        if (!html) return html;
        const trackingPixel = `<img src="${config.tracking.domain}/api/track/open/${recipientId}" width="1" height="1" alt="" style="display:block;" />`;
        const trackedHtml = html.replace(
            /<a\s+([^>]*href=["']([^"']+)["'][^>]*)>/gi,
            (match, attrs, url) => {
                if (url.startsWith('mailto:') || url.startsWith('#')) return match;
                const trackedUrl = `${config.tracking.domain}/api/track/click/${recipientId}?url=${encodeURIComponent(url)}`;
                return `<a ${attrs.replace(url, trackedUrl)}>`;
            }
        );
        return trackedHtml + trackingPixel;
    }

    normalizeUrls(html) {
        if (!html) return html;
        const baseUrl = config.app.apiUrl.endsWith('/') ? config.app.apiUrl.slice(0, -1) : config.app.apiUrl;
        return html.replace(
            /(src|href)=["']\/([^"']+)["']/gi,
            (match, attr, path) => `${attr}="${baseUrl}/${path}"`
        );
    }

    htmlToText(html) {
        return html
            .replace(/<style[^>]*>.*<\/style>/gms, '')
            .replace(/<script[^>]*>.*<\/script>/gms, '')
            .replace(/<[^>]+>/gm, '')
            .replace(/\s\s+/g, ' ')
            .trim();
    }

    async sendSystemEmail({ to, subject, html, text, senderConfig }) {
        const fromName = senderConfig?.fromName || config.smtp.from.name;
        const fromEmail = senderConfig?.fromEmail || config.smtp.from.email;
        const normalizedHtml = this.normalizeUrls(html);

        if (config.resendApiKey) {
            return await this.sendViaResend({ fromName, fromEmail, to, subject, html: normalizedHtml, text });
        }

        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject,
            html: normalizedHtml,
            text: text || this.htmlToText(html),
        };

        try {
            if (senderConfig) {
                const nodemailer = (await import('nodemailer')).default;
                const tempTransporter = nodemailer.createTransport({
                    host: senderConfig.host, port: senderConfig.port,
                    secure: senderConfig.secure, auth: senderConfig.auth,
                });
                const info = await tempTransporter.sendMail(mailOptions);
                tempTransporter.close();
                return { success: true, messageId: info.messageId };
            }

            if (this.isReady) {
                const info = await this.transporter.sendMail(mailOptions);
                return { success: true, messageId: info.messageId };
            } else {
                console.log(`📧 [SIMULATED SYSTEM EMAIL] to ${to}`);
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

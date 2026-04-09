import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

class EmailEngine {
    constructor() {
        this.transporter = null;
        this.transporterCache = new Map();
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
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 15000,
                tls: {
                    rejectUnauthorized: false, // Accept self-signed certs for custom domains
                },
            });

            console.log('📡 Verifying Default SMTP connection (10s timeout)...');
            const verifyPromise = this.transporter.verify();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('SMTP Verification Timeout')), 10000)
            );

            await Promise.race([verifyPromise, timeoutPromise]);
            this.isReady = true;
            console.log('✅ Default Email engine initialized successfully');
        } catch (error) {
            console.error('❌ Default Email engine initialization failed:', error.message);
            console.log('⚠️  Default SMTP unavailable. Dynamic senders will still work if configured correctly.');
            this.isReady = false;
        }
    }

    /**
     * Get or create a transporter for a specific SMTP configuration.
     * Implements TTL-based caching (30 min) with automatic cleanup.
     * 
     * @param {Object} smtpConfig - SMTP configuration object
     * @returns {Object} Nodemailer transporter
     */
    async getTransporter(smtpConfig) {
        if (!smtpConfig) return this.transporter;

        const cacheKey = `${smtpConfig.host}:${smtpConfig.port}:${smtpConfig.auth?.user}`;
        
        // Check cache with TTL
        if (this.transporterCache.has(cacheKey)) {
            const cached = this.transporterCache.get(cacheKey);
            const age = Date.now() - cached.createdAt;
            
            // Expire after 30 minutes
            if (age < 30 * 60 * 1000) {
                return cached.transporter;
            }
            
            // Expired — close old transporter and remove
            try { cached.transporter.close(); } catch (e) { /* ignore */ }
            this.transporterCache.delete(cacheKey);
        }

        const isSecure = smtpConfig.secure === true || smtpConfig.port === 465;

        const newTransporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: isSecure,
            auth: smtpConfig.auth,
            pool: true,
            maxConnections: 3,
            connectionTimeout: 15000,
            greetingTimeout: 10000,
            socketTimeout: 20000,
            tls: {
                rejectUnauthorized: false,
            },
        });

        this.transporterCache.set(cacheKey, {
            transporter: newTransporter,
            createdAt: Date.now(),
        });
        
        // Cleanup cache if it grows too large (> 50 transporters)
        if (this.transporterCache.size > 50) {
            const firstKey = this.transporterCache.keys().next().value;
            const oldest = this.transporterCache.get(firstKey);
            try { oldest.transporter.close(); } catch (e) { /* ignore */ }
            this.transporterCache.delete(firstKey);
        }

        return newTransporter;
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

    /**
     * Send a campaign email with tracking, rate limiting, and retry logic.
     */
    async send({ to, subject, html, text, campaignId, recipientId, senderConfig }) {
        const { allowed, waitTime } = await this.canSend();
        if (!allowed) throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(waitTime / 1000)}s`);

        const normalizedHtml = this.normalizeUrls(html);
        const trackedHtml = this.addTracking(normalizedHtml, recipientId);
        const fromName = senderConfig?.fromName || config.smtp.from.name;
        const fromEmail = senderConfig?.fromEmail || config.smtp.from.email;

        try {
            const activeTransporter = await this.getTransporter(senderConfig);

            if (!activeTransporter && !this.isReady) {
                console.log(`📧 [SIMULATED] Email to ${to} (No SMTP configured)`);
                return { success: true, messageId: `sim-${Date.now()}`, response: 'Simulated' };
            }

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

            // Attempt to send with retry for transient failures
            let lastError;
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const info = await activeTransporter.sendMail(mailOptions);
                    this.rateLimiter.count++;
                    console.log(`📧 Email sent to ${to} via SMTP - Message ID: ${info.messageId}`);
                    return { success: true, messageId: info.messageId, response: info.response };
                } catch (sendError) {
                    lastError = sendError;
                    
                    // Only retry on transient errors (timeout, socket reset), not auth or config errors
                    const isTransient = sendError.code === 'ETIMEDOUT' || 
                                        sendError.code === 'ESOCKET' ||
                                        sendError.code === 'ECONNRESET' ||
                                        sendError.message.includes('timeout');
                    
                    if (!isTransient || attempt === 2) break;
                    
                    console.log(`⚠️ Send attempt ${attempt} failed (${sendError.code || sendError.message}), retrying in 2s...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Invalidate cached transporter on connection errors
                    if (senderConfig) {
                        const cacheKey = `${senderConfig.host}:${senderConfig.port}:${senderConfig.auth?.user}`;
                        const cached = this.transporterCache.get(cacheKey);
                        if (cached) {
                            try { cached.transporter.close(); } catch (e) { /* ignore */ }
                            this.transporterCache.delete(cacheKey);
                        }
                    }
                }
            }

            // If we got here, all attempts failed
            throw lastError;

        } catch (error) {
            throw this.categorizeError(error, fromEmail, senderConfig);
        }
    }

    /**
     * Send a system email (OTP, welcome, etc.) — no tracking, no rate limiting.
     */
    async sendSystemEmail({ to, subject, html, text, senderConfig }) {
        const fromName = senderConfig?.fromName || config.smtp.from.name;
        const fromEmail = senderConfig?.fromEmail || config.smtp.from.email;
        const normalizedHtml = this.normalizeUrls(html);

        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject,
            html: normalizedHtml,
            text: text || this.htmlToText(html),
        };

        try {
            const activeTransporter = await this.getTransporter(senderConfig);

            if (activeTransporter) {
                const info = await activeTransporter.sendMail(mailOptions);
                return { success: true, messageId: info.messageId };
            } else if (this.isReady) {
                const info = await this.transporter.sendMail(mailOptions);
                return { success: true, messageId: info.messageId };
            } else {
                console.log(`📧 [SIMULATED SYSTEM EMAIL] to ${to}`);
                return { success: true, messageId: `sys-${Date.now()}` };
            }
        } catch (error) {
            console.error(`❌ System Email failed to ${to}:`, error.message);
            throw this.categorizeError(error, fromEmail, senderConfig);
        }
    }

    /**
     * Categorize SMTP errors into user-friendly messages.
     * Never logs sensitive credentials.
     */
    categorizeError(error, fromEmail, senderConfig) {
        const host = senderConfig?.host || config.smtp.host;
        const port = senderConfig?.port || config.smtp.port;

        if (error.code === 'EAUTH' || error.message.includes('auth') || error.message.includes('Invalid login')) {
            return new Error(
                `Authentication Failed: Please check your SMTP username/password for ${fromEmail}. ` +
                `Gmail requires an App Password (not your regular password). ` +
                `Zoho requires SMTP-specific credentials from your account security settings.`
            );
        }
        
        if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
            return new Error(
                `Connection Timeout: The SMTP server at ${host}:${port} took too long to respond. ` +
                `This commonly happens when your hosting provider (e.g., Render free tier) blocks outgoing SMTP ports (25, 465, 587). ` +
                `Consider upgrading to a paid plan or using an email API service.`
            );
        }
        
        if (error.code === 'ECONNREFUSED') {
            return new Error(
                `Connection Refused: Could not connect to SMTP host ${host}:${port}. ` +
                `Verify the SMTP host and port are correct.`
            );
        }
        
        if (error.code === 'ENOTFOUND') {
            return new Error(
                `Host Not Found: The SMTP server '${host}' could not be resolved. ` +
                `Check that the hostname is spelled correctly.`
            );
        }
        
        if (error.code === 'ESOCKET') {
            return new Error(
                `Socket Error: Could not establish a connection to ${host}:${port}. ` +
                `This may be caused by firewall restrictions or incorrect encryption settings. ` +
                `Try switching between TLS (port 587) and SSL (port 465).`
            );
        }
        
        if (error.message.includes('self signed certificate') || error.message.includes('SELF_SIGNED_CERT')) {
            return new Error(
                `SSL Certificate Error: The SMTP server at ${host} has a self-signed certificate. ` +
                `This is usually handled automatically, but your server may need additional TLS configuration.`
            );
        }

        // Generic fallback
        console.error(`❌ Uncategorized SMTP error to ${fromEmail}:`, error.message);
        return new Error(`Email send failed: ${error.message}`);
    }

    addTracking(html, recipientId) {
        if (!html || !recipientId) return html;
        const trackingPixel = `<img src="${config.tracking.domain}/api/track/open/${recipientId}" width="1" height="1" alt="" style="display:block;" />`;
        
        const trackedHtml = html.replace(
            /<a\s+([^>]*?)\s*href=["']([^"']*)["']([^>]*)>/gi,
            (match, prefix, url, suffix) => {
                // Ignore special links
                if (!url || url.startsWith('mailto:') || url.startsWith('#') || url.startsWith('tel:') || url.startsWith('sms:')) {
                    return match;
                }
                
                const trackedUrl = `${config.tracking.domain}/api/track/click/${recipientId}?url=${encodeURIComponent(url)}`;
                const p = prefix ? `${prefix} ` : '';
                return `<a ${p}href="${trackedUrl}"${suffix}>`;
            }
        );
        return trackedHtml + trackingPixel;
    }

    normalizeUrls(html) {
        if (!html) return html;
        const baseUrl = config.app.apiUrl.endsWith('/') ? config.app.apiUrl.slice(0, -1) : config.app.apiUrl;
        
        // Match relative paths like /uploads/... and turn them into absolute URLs
        return html.replace(
            /(src|href)=["']\/([^"']+)["']/gi,
            (match, attr, path) => `${attr}="${baseUrl}/${path}"`
        ).replace(
            // Also handle paths that don't start with / but are internal (common in some builders)
            /(src|href)=["'](images\/|uploads\/)([^"']+)["']/gi,
            (match, attr, dir, file) => `${attr}="${baseUrl}/${dir}${file}"`
        );
    }

    htmlToText(html) {
        if (!html) return '';
        return html
            .replace(/<style[^>]*>.*<\/style>/gms, '')
            .replace(/<script[^>]*>.*<\/script>/gms, '')
            .replace(/<[^>]+>/gm, '')
            .replace(/\s\s+/g, ' ')
            .trim();
    }

    async close() {
        if (this.transporter) {
            this.transporter.close();
        }
        for (const entry of this.transporterCache.values()) {
            const t = entry.transporter || entry;
            try { t.close(); } catch (e) { /* ignore */ }
        }
        this.transporterCache.clear();
        console.log('Email engine transporters closed');
    }
}

export default new EmailEngine();

import prisma from '../config/database.js';
import nodemailer from 'nodemailer';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { config } from '../config/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';

// ─── Helper: build Mailgun client ────────────────────────────────────────────
function buildMailgunClient(apiKey, region = 'us') {
    const mg = new Mailgun(FormData);
    return mg.client({
        username: 'api',
        key: apiKey,
        url: region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net',
    });
}

// ─── GET All Senders ──────────────────────────────────────────────────────────
export const getSenders = async (req, res, next) => {
    try {
        const senders = await prisma.senderEmail.findMany({
            where: { organizationId: req.organizationId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, name: true, email: true,
                providerType: true,
                smtpHost: true, smtpPort: true,
                mailgunDomain: true,
                encryption: true, isVerified: true, isActive: true,
                createdAt: true, updatedAt: true,
                _count: { select: { campaigns: true } },
            },
        });
        res.json(senders);
    } catch (error) {
        next(error);
    }
};

// ─── GET Single Sender ────────────────────────────────────────────────────────
export const getSender = async (req, res, next) => {
    try {
        const sender = await prisma.senderEmail.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
            select: {
                id: true, name: true, email: true,
                providerType: true,
                smtpHost: true, smtpPort: true, smtpUsername: true,
                mailgunDomain: true,
                encryption: true, isVerified: true, isActive: true,
                createdAt: true, updatedAt: true,
            },
        });
        if (!sender) return res.status(404).json({ error: 'Sender not found' });
        res.json(sender);
    } catch (error) {
        next(error);
    }
};

// ─── CREATE Sender ────────────────────────────────────────────────────────────
export const createSender = async (req, res, next) => {
    try {
        const { name, email, providerType = 'smtp' } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        let data = { organizationId: req.organizationId, name, email, providerType };

        // ── Mailgun sender ────────────────────────────────────────────────────
        if (providerType === 'mailgun') {
            const { mailgunApiKey, mailgunDomain } = req.body;
            if (!mailgunApiKey || !mailgunDomain) {
                return res.status(400).json({ error: 'Mailgun API key and domain are required' });
            }
            data.mailgunApiKey  = encrypt(mailgunApiKey.trim());
            data.mailgunDomain  = mailgunDomain.trim();
            // Leave SMTP fields at schema defaults ('')
        } else {
            // ── SMTP sender (existing logic unchanged) ────────────────────────
            const { smtpHost, smtpPort, smtpUsername, smtpPassword, encryption } = req.body;
            if (!smtpHost || !smtpUsername || !smtpPassword) {
                return res.status(400).json({ error: 'All SMTP fields are required' });
            }
            data.smtpHost      = smtpHost;
            data.smtpPort      = smtpPort || 587;
            data.smtpUsername  = smtpUsername;
            data.smtpPassword  = encrypt(smtpPassword.replace(/\s+/g, ''));
            data.encryption    = encryption || 'TLS';
        }

        console.log(`[SenderService] Creating new ${providerType} sender: ${email}`);
        const sender = await prisma.senderEmail.create({ data });
        res.status(201).json(sender);
    } catch (error) {
        console.error('[SenderService] Error during sender creation:', error.message);
        next(error);
    }
};

// ─── UPDATE Sender ────────────────────────────────────────────────────────────
export const updateSender = async (req, res, next) => {
    try {
        const existing = await prisma.senderEmail.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
        });
        if (!existing) return res.status(404).json({ error: 'Sender not found' });

        const { name, email, isActive, providerType } = req.body;
        const updateData = {
            ...(name      && { name }),
            ...(email     && { email }),
            ...(isActive  !== undefined && { isActive }),
            ...(providerType && { providerType }),
        };

        if ((providerType || existing.providerType) === 'mailgun') {
            const { mailgunApiKey, mailgunDomain } = req.body;
            if (mailgunApiKey) updateData.mailgunApiKey = encrypt(mailgunApiKey.trim());
            if (mailgunDomain) updateData.mailgunDomain = mailgunDomain.trim();
        } else {
            // SMTP path (unchanged)
            const { smtpHost, smtpPort, smtpUsername, smtpPassword, encryption } = req.body;
            if (smtpHost)     updateData.smtpHost     = smtpHost;
            if (smtpPort)     updateData.smtpPort     = smtpPort;
            if (smtpUsername) updateData.smtpUsername  = smtpUsername;
            if (smtpPassword) updateData.smtpPassword  = encrypt(smtpPassword.replace(/\s+/g, ''));
            if (encryption)   updateData.encryption    = encryption;
        }

        const sender = await prisma.senderEmail.update({
            where: { id: req.params.id },
            data: updateData,
        });
        res.json(sender);
    } catch (error) {
        next(error);
    }
};

// ─── DELETE Sender ────────────────────────────────────────────────────────────
export const deleteSender = async (req, res, next) => {
    try {
        const existing = await prisma.senderEmail.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
        });
        if (!existing) return res.status(404).json({ error: 'Sender not found' });
        await prisma.senderEmail.delete({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// ─── TEST Sender Connection ───────────────────────────────────────────────────
export const testSender = async (req, res, next) => {
    try {
        const sender = await prisma.senderEmail.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
        });
        if (!sender) return res.status(404).json({ error: 'Sender not found' });

        // ── Mailgun validation ────────────────────────────────────────────────
        if (sender.providerType === 'mailgun') {
            if (!sender.mailgunApiKey || !sender.mailgunDomain) {
                return res.json({ success: false, message: 'Mailgun API key or domain is not configured.' });
            }
            try {
                const decryptedKey = decrypt(sender.mailgunApiKey);
                const mgClient = buildMailgunClient(decryptedKey, 'us');

                // Verify domain by listing its DNS records — throws on invalid key/domain
                await mgClient.domains.get(sender.mailgunDomain);

                await prisma.senderEmail.update({
                    where: { id: sender.id },
                    data: { isVerified: true },
                });
                return res.json({ success: true, message: `✅ Mailgun domain "${sender.mailgunDomain}" verified successfully and is ready to send.` });
            } catch (mgErr) {
                const msg = mgErr?.details || mgErr?.message || 'Mailgun validation failed.';
                return res.json({ success: false, message: `Mailgun Error: ${msg}` });
            }
        }

        // ── SMTP validation (unchanged) ───────────────────────────────────────
        const decryptedPassword = decrypt(sender.smtpPassword);
        const transporter = nodemailer.createTransport({
            host: sender.smtpHost, port: sender.smtpPort,
            secure: sender.encryption === 'SSL',
            auth: { user: sender.smtpUsername, pass: decryptedPassword },
            connectionTimeout: 15000,
            greetingTimeout: 10000,
            tls: { rejectUnauthorized: false },
        });

        try {
            const verifyPromise = transporter.verify();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('SMTP_TIMEOUT')), 15000)
            );
            await Promise.race([verifyPromise, timeoutPromise]);
            await prisma.senderEmail.update({ where: { id: sender.id }, data: { isVerified: true } });
            transporter.close();
            res.json({ success: true, message: 'SMTP connection successful! This sender is ready to use.' });
        } catch (smtpError) {
            transporter.close();
            let errorMessage = `SMTP failed: ${smtpError.message}`;
            if (smtpError.message === 'SMTP_TIMEOUT' || smtpError.code === 'ETIMEDOUT') {
                errorMessage = `Connection Timeout: The SMTP server took too long to respond. This commonly happens when your hosting provider blocks outgoing SMTP ports.`;
            } else if (smtpError.code === 'ECONNREFUSED') {
                errorMessage = `Connection Refused: The SMTP host '${sender.smtpHost}' refused the connection on port ${sender.smtpPort}.`;
            } else if (smtpError.code === 'ENOTFOUND') {
                errorMessage = `Host Not Found: The SMTP server '${sender.smtpHost}' could not be resolved.`;
            } else if (smtpError.code === 'EAUTH' || smtpError.message.includes('auth')) {
                errorMessage = `Authentication Failed: The username or password for ${sender.email} is incorrect.`;
            } else if (smtpError.code === 'ESOCKET') {
                errorMessage = `Socket Error: Could not establish a secure connection to ${sender.smtpHost}:${sender.smtpPort}.`;
            }
            res.json({ success: false, message: errorMessage });
        }
    } catch (error) {
        next(error);
    }
};

// ─── SEND TEST EMAIL ──────────────────────────────────────────────────────────
export const sendTestEmail = async (req, res, next) => {
    try {
        const { testEmail } = req.body;
        const sender = await prisma.senderEmail.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
        });
        if (!sender) return res.status(404).json({ error: 'Sender not found' });

        const targetEmail = testEmail || sender.email;
        const from = `${sender.name} <${sender.email}>`;
        const testHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width:600px;margin:auto;padding:30px;border:1px solid #e2e8f0;border-radius:12px;">
                <h2 style="color:#1a202c;"> Connection Test Successful</h2>
                <p style="color:#4a5568;">This sender (<strong>${sender.email}</strong>) is working correctly via <strong>${sender.providerType === 'mailgun' ? 'Mailgun API' : 'SMTP'}</strong>.</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
                <p style="color:#718096;font-size:13px;">
                    ${sender.providerType === 'mailgun'
                        ? `Sent via Mailgun — domain: ${sender.mailgunDomain}`
                        : `Sent via ${sender.smtpHost}:${sender.smtpPort} (${sender.encryption})`}
                </p>
            </div>`;

        // ── Mailgun send ──────────────────────────────────────────────────────
        if (sender.providerType === 'mailgun') {
            try {
                const decryptedKey = decrypt(sender.mailgunApiKey);
                const mgClient = buildMailgunClient(decryptedKey, 'us');
                await mgClient.messages.create(sender.mailgunDomain, {
                    from,
                    to: [targetEmail],
                    subject: 'Campaigns — Test Email (Mailgun)',
                    html: testHtml,
                });
                return res.json({ success: true, message: 'Test email sent via Mailgun! Check your inbox.' });
            } catch (mgErr) {
                const msg = mgErr?.details || mgErr?.message || 'Unknown Mailgun error';
                return res.json({ success: false, message: `Mailgun send failed: ${msg}` });
            }
        }

        // ── SMTP send (unchanged) ─────────────────────────────────────────────
        const decryptedPassword = decrypt(sender.smtpPassword);
        const transporter = nodemailer.createTransport({
            host: sender.smtpHost, port: sender.smtpPort,
            secure: sender.encryption === 'SSL',
            auth: { user: sender.smtpUsername, pass: decryptedPassword },
            connectionTimeout: 15000,
            greetingTimeout: 10000,
            tls: { rejectUnauthorized: false },
        });

        try {
            await transporter.sendMail({ from, to: targetEmail, subject: 'Campaigns — Test Email', html: testHtml });
            transporter.close();
            res.json({ success: true, message: 'Test email sent successfully! Check your inbox.' });
        } catch (sendError) {
            transporter.close();
            let errorMessage = `Send failed: ${sendError.message}`;
            if (sendError.code === 'EAUTH' || sendError.message.includes('auth')) {
                errorMessage = `Authentication Failed: Check your SMTP credentials.`;
            } else if (sendError.code === 'ETIMEDOUT' || sendError.message.includes('timeout')) {
                errorMessage = `Connection Timeout: SMTP ports may be blocked by your hosting provider.`;
            }
            res.json({ success: false, message: errorMessage });
        }
    } catch (error) {
        next(error);
    }
};

import prisma from '../config/database.js';
import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export const getSenders = async (req, res, next) => {
    try {
        const senders = await prisma.senderEmail.findMany({
            where: { organizationId: req.organizationId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, name: true, email: true, smtpHost: true, smtpPort: true,
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

export const getSender = async (req, res, next) => {
    try {
        const sender = await prisma.senderEmail.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
            select: {
                id: true, name: true, email: true, smtpHost: true, smtpPort: true,
                smtpUsername: true, encryption: true, isVerified: true, isActive: true,
                createdAt: true, updatedAt: true,
            },
        });
        if (!sender) return res.status(404).json({ error: 'Sender not found' });
        res.json(sender);
    } catch (error) {
        next(error);
    }
};

export const createSender = async (req, res, next) => {
    try {
        const { name, email, smtpHost, smtpPort, smtpUsername, smtpPassword, encryption } = req.body;
        if (!name || !email || !smtpHost || !smtpUsername || !smtpPassword) {
            return res.status(400).json({ error: 'All SMTP fields are required' });
        }

        const normalizedPassword = smtpPassword.replace(/\s+/g, '');
        const encryptedPassword = encrypt(normalizedPassword);

        console.log(`[SenderService] Creating new sender: ${email}`);
        console.time('sender-creation');
        const sender = await prisma.senderEmail.create({
            data: {
                organizationId: req.organizationId,
                name, email, smtpHost,
                smtpPort: smtpPort || 587,
                smtpUsername,
                smtpPassword: encryptedPassword,
                encryption: encryption || 'TLS',
            },
        });
        console.timeEnd('sender-creation');
        console.log(`[SenderService] Successfully created sender ID: ${sender.id}`);
        res.status(201).json(sender);
    } catch (error) {
        console.error('[SenderService] Error during sender creation:', error.message);
        next(error);
    }
};

export const updateSender = async (req, res, next) => {
    try {
        const existing = await prisma.senderEmail.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
        });
        if (!existing) return res.status(404).json({ error: 'Sender not found' });

        const { name, email, smtpHost, smtpPort, smtpUsername, smtpPassword, encryption, isActive } = req.body;

        let encryptedPassword;
        if (smtpPassword) {
            const normalizedPassword = smtpPassword.replace(/\s+/g, '');
            encryptedPassword = encrypt(normalizedPassword);
        }

        const sender = await prisma.senderEmail.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }), ...(email && { email }),
                ...(smtpHost && { smtpHost }), ...(smtpPort && { smtpPort }),
                ...(smtpUsername && { smtpUsername }),
                ...(encryptedPassword && { smtpPassword: encryptedPassword }),
                ...(encryption && { encryption }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        res.json(sender);
    } catch (error) {
        next(error);
    }
};

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

/**
 * Test SMTP connection by verifying the transporter.
 * Decrypts the stored password before creating the transporter.
 */
export const testSender = async (req, res, next) => {
    try {
        const sender = await prisma.senderEmail.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
        });
        if (!sender) return res.status(404).json({ error: 'Sender not found' });

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
            
            if (smtpError.message === 'SMTP_TIMEOUT' || smtpError.code === 'ETIMEDOUT' || smtpError.message.includes('timeout')) {
                errorMessage = `Connection Timeout: The SMTP server took too long to respond. This commonly happens when your hosting provider (e.g., Render free tier) blocks outgoing SMTP ports (25, 465, 587). Consider upgrading your hosting plan or using a different email sending approach.`;
            } else if (smtpError.code === 'ECONNREFUSED') {
                errorMessage = `Connection Refused: The SMTP host '${sender.smtpHost}' refused the connection on port ${sender.smtpPort}. Verify the host and port are correct.`;
            } else if (smtpError.code === 'ENOTFOUND') {
                errorMessage = `Host Not Found: The SMTP server '${sender.smtpHost}' could not be resolved. Check that the hostname is spelled correctly.`;
            } else if (smtpError.code === 'EAUTH' || smtpError.message.includes('auth') || smtpError.message.includes('Invalid login')) {
                errorMessage = `Authentication Failed: The username or password for ${sender.email} is incorrect. If using Gmail, make sure you use an 'App Password' (not your regular Gmail password).`;
            } else if (smtpError.code === 'ESOCKET') {
                errorMessage = `Socket Error: Could not establish a secure connection to ${sender.smtpHost}:${sender.smtpPort}. Try switching between TLS (port 587) and SSL (port 465).`;
            }
            
            res.json({ success: false, message: errorMessage });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Send a test email through the configured sender.
 * Decrypts the stored password before creating the transporter.
 */
export const sendTestEmail = async (req, res, next) => {
    try {
        const { testEmail } = req.body;
        const sender = await prisma.senderEmail.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
        });
        if (!sender) return res.status(404).json({ error: 'Sender not found' });

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
            await transporter.sendMail({
                from: `${sender.name} <${sender.email}>`,
                to: testEmail || sender.email,
                subject: 'Campaigns — Test Email',
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <h2 style="color: #1a202c; margin-bottom: 8px;">✅ Connection Test Successful</h2>
                        <p style="color: #4a5568;">This sender account (<strong>${sender.email}</strong>) is working correctly and can send emails.</p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                        <p style="color: #718096; font-size: 13px;">Sent via ${sender.smtpHost}:${sender.smtpPort} (${sender.encryption})</p>
                    </div>
                `,
            });
            transporter.close();
            res.json({ success: true, message: 'Test email sent successfully! Check your inbox.' });
        } catch (sendError) {
            transporter.close();
            
            let errorMessage = `Send failed: ${sendError.message}`;
            if (sendError.code === 'EAUTH' || sendError.message.includes('auth')) {
                errorMessage = `Authentication Failed: Check your SMTP credentials. Gmail requires an App Password.`;
            } else if (sendError.code === 'ETIMEDOUT' || sendError.message.includes('timeout')) {
                errorMessage = `Connection Timeout: SMTP ports may be blocked by your hosting provider.`;
            }
            
            res.json({ success: false, message: errorMessage });
        }
    } catch (error) {
        next(error);
    }
};

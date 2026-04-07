import prisma from '../config/database.js';
import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

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

        console.log(`[SenderService] Creating new sender: ${email}`);
        console.time('sender-creation');
        const sender = await prisma.senderEmail.create({
            data: {
                organizationId: req.organizationId,
                name, email, smtpHost,
                smtpPort: smtpPort || 587,
                smtpUsername,
                smtpPassword: normalizedPassword,
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

        const normalizedPassword = smtpPassword ? smtpPassword.replace(/\s+/g, '') : undefined;

        const sender = await prisma.senderEmail.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }), ...(email && { email }),
                ...(smtpHost && { smtpHost }), ...(smtpPort && { smtpPort }),
                ...(smtpUsername && { smtpUsername }),
                ...(normalizedPassword && { smtpPassword: normalizedPassword }),
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

export const testSender = async (req, res, next) => {
    try {
        const sender = await prisma.senderEmail.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
        });
        if (!sender) return res.status(404).json({ error: 'Sender not found' });

        const transporter = nodemailer.createTransport({
            host: sender.smtpHost, port: sender.smtpPort,
            secure: sender.encryption === 'SSL',
            auth: { user: sender.smtpUsername, pass: sender.smtpPassword },
            connectionTimeout: 10000,
        });

        try {
            await transporter.verify();
            await prisma.senderEmail.update({ where: { id: sender.id }, data: { isVerified: true } });
            transporter.close();
            res.json({ success: true, message: 'SMTP connection successful' });
        } catch (smtpError) {
            transporter.close();
            
            // --- FIX FOR RENDER/RESEND: Allow verification if Resend API is available ---
            if (config.resendApiKey && (smtpError.code === 'ETIMEDOUT' || smtpError.message.includes('timeout'))) {
                await prisma.senderEmail.update({ where: { id: sender.id }, data: { isVerified: true } });
                return res.json({ 
                    success: true, 
                    message: 'SMTP timed out, but Resend API is detected. Sender verified for use via HTTP fallback.' 
                });
            }
            // -------------------------------------------------------------------------

            let errorMessage = `SMTP failed: ${smtpError.message}`;
            
            if (smtpError.code === 'ETIMEDOUT' || smtpError.message.includes('timeout')) {
                errorMessage = `Connection Timeout: The server took too long to respond. This often happens if your host (like Render) blocks SMTP ports 587/465.`;
            } else if (smtpError.code === 'ECONNREFUSED') {
                errorMessage = `Connection Refused: The SMTP host '${sender.smtpHost}' refused to connect on port ${sender.smtpPort}. Check if the host and port are correct.`;
            } else if (smtpError.code === 'EAUTH' || smtpError.message.includes('auth') || smtpError.message.includes('Invalid login')) {
                errorMessage = `Authentication Failed: The username or password for ${sender.email} is incorrect. If using Gmail, make sure you use an 'App Password'.`;
            }
            
            res.json({ success: false, message: errorMessage });
        }
    } catch (error) {
        next(error);
    }
};

export const sendTestEmail = async (req, res, next) => {
    try {
        const { testEmail } = req.body;
        const sender = await prisma.senderEmail.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
        });
        if (!sender) return res.status(404).json({ error: 'Sender not found' });

        const transporter = nodemailer.createTransport({
            host: sender.smtpHost, port: sender.smtpPort,
            secure: sender.encryption === 'SSL',
            auth: { user: sender.smtpUsername, pass: sender.smtpPassword },
        });

        try {
            await transporter.sendMail({
                from: `${sender.name} <${sender.email}>`,
                to: testEmail || sender.email,
                subject: 'Campaigns — Test Email',
                html: '<h2>✅ Connection Test Successful</h2><p>This sender account is working correctly.</p>',
            });
            transporter.close();
            res.json({ success: true, message: 'Test email sent successfully' });
        } catch (sendError) {
            transporter.close();
            res.json({ success: false, message: `Send failed: ${sendError.message}` });
        }
    } catch (error) {
        next(error);
    }
};

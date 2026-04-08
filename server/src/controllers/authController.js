import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import EmailEngine from '../services/EmailEngine.js';
import { decrypt } from '../utils/crypto.js';

const mapOrg = (org) => {
    if (!org) return null;
    const settings = (org.settings && typeof org.settings === 'object' && !Array.isArray(org.settings)) 
        ? org.settings 
        : {};
    const logoUrl = settings.logoUrl
        ? (settings.logoUrl.startsWith('http') ? settings.logoUrl : `${config.app.apiUrl}${settings.logoUrl}`)
        : null;
    const safeCompanyId = org.companyId || (org.id ? org.id.slice(0, 8) : null);
    return {
        id: org.id,
        name: org.name,
        companyId: safeCompanyId,
        settings: { ...settings, logoUrl },
    };
};

export const register = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, organizationName } = req.body;

        if (!email || !password || !organizationName) {
            return res.status(400).json({ error: 'Email, password, and organization name are required' });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create organization and user
        const passwordHash = await bcrypt.hash(password, 10);
        const slug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const companyId = 'ORG-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        const organization = await prisma.organization.create({
            data: {
                name: organizationName,
                slug: `${slug}-${Date.now()}`,
                companyId,
                users: {
                    create: {
                        email,
                        passwordHash,
                        firstName: firstName || '',
                        lastName: lastName || '',
                        role: 'ADMIN',
                    },
                },
            },
            include: { users: true },
        });

        const user = organization.users[0];
        const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn,
        });

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                organization: mapOrg(organization),
            },
            token,
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: { organization: true },
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn,
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                organization: mapOrg(user.organization),
            },
            token,
        });
    } catch (error) {
        next(error);
    }
};

export const me = async (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            role: req.user.role,
            organization: mapOrg(req.user.organization),
        },
    });
};

export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await prisma.user.findUnique({
            where: { email },
            include: { organization: true },
        });
        // Always return success to avoid email enumeration
        if (!user) return res.json({ message: 'If the email exists, an OTP has been sent' });

        // Rate limit: max 3 OTPs per email in last 10 minutes
        const recentTokens = await prisma.passwordResetToken.count({
            where: {
                email,
                createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
            },
        });
        if (recentTokens >= 3) {
            return res.status(429).json({ error: 'Too many requests. Try again later.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.passwordResetToken.create({
            data: { email, otp, expiresAt },
        });

        // Resolve organization-specific sender (fallback to global config)
        let senderConfig = null;
        // Primary: sender belonging to the user's organization
        if (user.organizationId) {
            const sender = await prisma.senderEmail.findFirst({
                where: { organizationId: user.organizationId, isActive: true },
                orderBy: { updatedAt: 'desc' },
            });
            if (sender) {
                senderConfig = {
                    host: sender.smtpHost,
                    port: sender.smtpPort,
                    secure: sender.encryption === 'SSL',
                    auth: { user: sender.smtpUsername, pass: decrypt(sender.smtpPassword) },
                    fromName: sender.name,
                    fromEmail: sender.email,
                };
            }
        }
        // Fallback: newest active sender in the system (so OTPs still go out even if org has none configured)
        if (!senderConfig) {
            const sender = await prisma.senderEmail.findFirst({
                where: { isActive: true },
                orderBy: { updatedAt: 'desc' },
            });
            if (sender) {
                senderConfig = {
                    host: sender.smtpHost,
                    port: sender.smtpPort,
                    secure: sender.encryption === 'SSL',
                    auth: { user: sender.smtpUsername, pass: decrypt(sender.smtpPassword) },
                    fromName: sender.name,
                    fromEmail: sender.email,
                };
            }
        }

        // Send OTP via email
        try {
            await EmailEngine.sendSystemEmail({
                to: email,
                subject: 'Password Reset OTP - Campaigns',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #1a202c;">Password Reset Request</h2>
                        <p>We received a request to reset your password. Use the following One-Time Password (OTP) to proceed:</p>
                        <div style="background: #f7fafc; padding: 20px; border-radius: 4px; text-align: center; margin: 20px 0;">
                            <strong style="font-size: 32px; letter-spacing: 5px; color: #3182ce;">${otp}</strong>
                        </div>
                        <p style="color: #718096; font-size: 14px;">This OTP will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                    </div>
                `,
                senderConfig,
            });
        } catch (emailErr) {
            console.error(`Failed to send OTP to ${email}:`, emailErr.message);
        }

        res.json({ message: 'If the email exists, an OTP has been sent' });
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Email, OTP, and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const token = await prisma.passwordResetToken.findFirst({
            where: {
                email, otp, used: false,
                expiresAt: { gte: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!token) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Mark token as used
        await prisma.passwordResetToken.update({
            where: { id: token.id },
            data: { used: true },
        });

        // Update password
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email },
            data: { passwordHash },
        });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        next(error);
    }
};

export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { passwordHash },
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        next(error);
    }
};

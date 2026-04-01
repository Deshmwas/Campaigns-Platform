import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import EmailEngine from '../services/EmailEngine.js';

const normalizeRole = (role) => {
    const value = (role || '').toUpperCase();
    if (value === 'USER') return 'MANAGER';
    if (['ADMIN', 'MANAGER', 'VIEWER'].includes(value)) return value;
    return null;
};

export const getUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            where: { organizationId: req.organizationId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });
        res.json(users);
    } catch (error) {
        next(error);
    }
};

export const createUser = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, role } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'First name, last name, email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const normalizedRole = normalizeRole(role) || 'MANAGER';

        const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                passwordHash,
                firstName,
                lastName,
                role: normalizedRole,
                organizationId: req.organizationId,
            },
        });

        // Send welcome email with credentials
        try {
            await EmailEngine.sendSystemEmail({
                to: user.email,
                subject: 'Account Created - Campaigns Platform',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #1a202c;">Welcome to Campaigns, ${user.firstName}!</h2>
                        <p>An account has been created for you. You can now log in using the following credentials:</p>
                        <div style="background: #f7fafc; padding: 15px; border-radius: 4px; border-left: 4px solid #3182ce; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
                            <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
                        </div>
                        <p>We recommend changing your password after your first login.</p>
                        <div style="margin-top: 30px; text-align: center;">
                            <a href="${process.env.APP_URL || 'http://localhost:3000'}/login" 
                               style="background: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                               Log In Now
                            </a>
                        </div>
                    </div>
                `
            });
        } catch (emailErr) {
            console.warn('Failed to send welcome email, but user was created:', emailErr.message);
        }

        res.status(201).json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
        });
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, role, isActive, password } = req.body;

        const existingUser = await prisma.user.findFirst({
            where: { id, organizationId: req.organizationId },
        });

        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = {};

        if (firstName !== undefined) userData.firstName = firstName;
        if (lastName !== undefined) userData.lastName = lastName;
        if (typeof isActive === 'boolean') userData.isActive = isActive;

        if (role) {
            const normalizedRole = normalizeRole(role);
            if (!normalizedRole) return res.status(400).json({ error: 'Invalid role' });

            if (existingUser.role === 'ADMIN' && normalizedRole !== 'ADMIN') {
                const adminCount = await prisma.user.count({
                    where: { organizationId: req.organizationId, role: 'ADMIN', isActive: true },
                });
                if (adminCount <= 1) {
                    return res.status(400).json({ error: 'At least one admin user is required' });
                }
            }

            userData.role = normalizedRole;
        }

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }
            userData.passwordHash = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data: userData,
        });

        res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Prevent self-deletion
        if (id === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own account' });
        }

        const user = await prisma.user.findFirst({
            where: { id, organizationId: req.organizationId },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 'ADMIN') {
            const adminCount = await prisma.user.count({
                where: { organizationId: req.organizationId, role: 'ADMIN', isActive: true },
            });
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'At least one admin user is required' });
            }
        }

        await prisma.user.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

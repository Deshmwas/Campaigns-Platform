import path from 'path';
import prisma from '../config/database.js';
import { config } from '../config/index.js';

const buildLogoUrl = (relativePath) => {
    if (!relativePath) return null;
    return relativePath.startsWith('http') ? relativePath : `${config.app.apiUrl}${relativePath}`;
};

export const getPublicBranding = async (req, res, next) => {
    try {
        const { companyId, slug } = req.query;

        let org = null;

        if (companyId || slug) {
            org = await prisma.organization.findFirst({
                where: {
                    ...(companyId ? { companyId } : {}),
                    ...(slug ? { slug } : {}),
                },
                orderBy: { createdAt: 'asc' },
            });
        }

        if (!org) {
            // Find an organization that has a logo, or just the most recent one
            const orgs = await prisma.organization.findMany({
                orderBy: [
                    { updatedAt: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: 10 // Only check recent ones for performance
            });
            org = orgs.find(o => {
                const s = o.settings;
                return s && typeof s === 'object' && !Array.isArray(s) && s.logoUrl;
            }) || orgs[0];
        }

        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const logoUrl = buildLogoUrl(org.settings?.logoUrl);
        const companyIdSafe = org.companyId || (org.id ? org.id.slice(0, 8) : null);

        res.json({
            name: org.name,
            companyId: companyIdSafe,
            logoUrl,
        });
    } catch (error) {
        next(error);
    }
};

export const uploadLogo = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let logoPath = req.file.secure_url || req.file.path;
        if (!req.file.secure_url && req.file.path) {
            const uploadsIdx = req.file.path.lastIndexOf('uploads');
            if (uploadsIdx !== -1) {
                const rel = req.file.path.slice(uploadsIdx).replace(/\\\\/g, '/').replace(/\\/g, '/');
                logoPath = `/${rel}`;
            }
        }

        // Update organization settings
        const org = await prisma.organization.findUnique({
            where: { id: req.organizationId }
        });

        const settings = {
            ...(org.settings || {}),
            logoUrl: logoPath
        };

        await prisma.organization.update({
            where: { id: req.organizationId },
            data: { settings }
        });

        res.json({ logoUrl: buildLogoUrl(logoPath), message: 'Logo uploaded successfully' });
    } catch (error) {
        next(error);
    }
};

export const updateSettings = async (req, res, next) => {
    try {
        const { name, smsGateway, smsApiKey, smsUsername, smsApiUrl } = req.body;
        
        const org = await prisma.organization.findUnique({
            where: { id: req.organizationId }
        });

        const settings = {
            ...(org.settings || {}),
            ...(smsGateway !== undefined && { smsGateway }),
            ...(smsApiKey !== undefined && { smsApiKey }),
            ...(smsUsername !== undefined && { smsUsername }),
            ...(smsApiUrl !== undefined && { smsApiUrl }),
        };

        const updated = await prisma.organization.update({
            where: { id: req.organizationId },
            data: { 
                ...(name && { name }),
                settings 
            }
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};

export const getSettings = async (req, res, next) => {
    try {
        const org = await prisma.organization.findUnique({
            where: { id: req.organizationId },
            select: {
                id: true,
                name: true,
                slug: true,
                companyId: true,
                settings: true
            }
        });
        res.json({
            ...org,
            settings: {
                ...(org.settings || {}),
                logoUrl: buildLogoUrl(org.settings?.logoUrl),
            }
        });
    } catch (error) {
        next(error);
    }
};

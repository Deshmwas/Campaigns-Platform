import prisma from '../config/database.js';
import queueService from '../services/QueueService.js';
import { decrypt } from '../utils/crypto.js';

export const getCampaigns = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, type, status } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {
            organizationId: req.organizationId,
            ...(type && { type }),
            ...(status && { status }),
        };

        const [campaigns, total] = await Promise.all([
            prisma.campaign.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    stats: true,
                    _count: { select: { recipients: true } },
                },
            }),
            prisma.campaign.count({ where }),
        ]);

        res.json({
            campaigns,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / take),
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getCampaign = async (req, res, next) => {
    try {
        const { id } = req.params;

        const campaign = await prisma.campaign.findFirst({
            where: {
                id,
                organizationId: req.organizationId,
            },
            include: {
                stats: true,
                recipients: {
                    take: 100,
                    orderBy: { createdAt: 'desc' },
                    include: { contact: true },
                },
            },
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json(campaign);
    } catch (error) {
        next(error);
    }
};

export const createCampaign = async (req, res, next) => {
    try {
        const { name, type, subject, content, listIds, scheduledAt, senderEmailId, templateId } = req.body;

        if (!['EMAIL', 'SMS'].includes(type)) {
            return res.status(400).json({ error: 'Invalid campaign type' });
        }

        if (type === 'EMAIL' && !subject) {
            return res.status(400).json({ error: 'Subject is required for email campaigns' });
        }

        const campaign = await prisma.campaign.create({
            data: {
                organizationId: req.organizationId,
                name, type, subject, content,
                templateId: templateId || null,
                senderEmailId: senderEmailId || null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
            },
        });

        // Create recipients from list members
        if (listIds && listIds.length > 0) {
            const contacts = await prisma.contact.findMany({
                where: {
                    organizationId: req.organizationId,
                    status: 'ACTIVE',
                    listMemberships: {
                        some: { listId: { in: listIds } },
                    },
                    ...(type === 'EMAIL' ? { email: { not: null } } : { phone: { not: null } }),
                },
                distinct: ['id'],
            });

            await prisma.campaignRecipient.createMany({
                data: contacts.map(contact => ({
                    campaignId: campaign.id,
                    contactId: contact.id,
                })),
            });

            // Initialize stats
            await prisma.campaignStats.create({
                data: {
                    campaignId: campaign.id,
                    totalRecipients: contacts.length,
                },
            });
        }

        res.status(201).json(campaign);
    } catch (error) {
        next(error);
    }
};

export const updateCampaign = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, subject, content, status, scheduledAt } = req.body;

        const existing = await prisma.campaign.findFirst({
            where: { id, organizationId: req.organizationId },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        if (existing.status === 'SENT') {
            return res.status(400).json({ error: 'Cannot modify a sent campaign' });
        }

        const campaign = await prisma.campaign.update({
            where: { id },
            data: {
                name,
                subject,
                content,
                status,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
            },
        });

        res.json(campaign);
    } catch (error) {
        next(error);
    }
};

export const sendCampaign = async (req, res, next) => {
    try {
        const { id } = req.params;

        const campaign = await prisma.campaign.findFirst({
            where: { id, organizationId: req.organizationId },
            include: {
                recipients: { include: { contact: true } },
                senderEmail: true,
            },
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        if (campaign.status === 'SENT' || campaign.status === 'SENDING') {
            return res.status(400).json({ error: 'Campaign already sent or sending' });
        }

        // Update status to SENDING
        await prisma.campaign.update({
            where: { id },
            data: { status: 'SENDING' },
        });

        // Build sender config if a sender email is attached
        const senderConfig = campaign.senderEmail ? {
            host: campaign.senderEmail.smtpHost,
            port: campaign.senderEmail.smtpPort,
            secure: campaign.senderEmail.encryption === 'SSL',
            auth: { user: campaign.senderEmail.smtpUsername, pass: decrypt(campaign.senderEmail.smtpPassword) },
            fromName: campaign.senderEmail.name,
            fromEmail: campaign.senderEmail.email,
        } : null;

        // Enqueue jobs for each recipient
        for (const recipient of campaign.recipients) {
            if (campaign.type === 'EMAIL') {
                const personalizedContent = personalizeContent(campaign.content, recipient.contact);
                const personalizedSubject = personalizeContent(campaign.subject, recipient.contact);

                await queueService.enqueueJob({
                    type: 'email',
                    payload: {
                        recipientId: recipient.id,
                        campaignId: campaign.id,
                        to: recipient.contact.email,
                        subject: personalizedSubject,
                        html: personalizedContent,
                        senderConfig,
                    },
                });
            } else if (campaign.type === 'SMS') {
                const personalizedMessage = personalizeContent(campaign.content, recipient.contact);

                await queueService.enqueueJob({
                    type: 'sms',
                    payload: {
                        recipientId: recipient.id,
                        campaignId: campaign.id,
                        to: recipient.contact.phone,
                        message: personalizedMessage,
                    },
                });
            }
        }

        res.json({ message: 'Campaign queued for sending', recipients: campaign.recipients.length });
    } catch (error) {
        next(error);
    }
};

export const retryFailedCampaign = async (req, res, next) => {
    try {
        const { id } = req.params;

        const campaign = await prisma.campaign.findFirst({
            where: { id, organizationId: req.organizationId },
            include: {
                recipients: { 
                    where: { status: 'FAILED' },
                    include: { contact: true } 
                },
                senderEmail: true,
            },
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        if (campaign.recipients.length === 0) {
            return res.status(400).json({ error: 'No failed recipients to retry' });
        }

        // Build sender config
        const senderConfig = campaign.senderEmail ? {
            host: campaign.senderEmail.smtpHost,
            port: campaign.senderEmail.smtpPort,
            secure: campaign.senderEmail.encryption === 'SSL',
            auth: { user: campaign.senderEmail.smtpUsername, pass: decrypt(campaign.senderEmail.smtpPassword) },
            fromName: campaign.senderEmail.name,
            fromEmail: campaign.senderEmail.email,
        } : null;

        // Reset failed recipients to PENDING and re-enqueue
        for (const recipient of campaign.recipients) {
            await prisma.campaignRecipient.update({
                where: { id: recipient.id },
                data: { status: 'PENDING', errorMessage: null, sentAt: null }
            });

            if (campaign.type === 'EMAIL') {
                const personalizedContent = personalizeContent(campaign.content, recipient.contact);
                const personalizedSubject = personalizeContent(campaign.subject, recipient.contact);

                await queueService.enqueueJob({
                    type: 'email',
                    payload: {
                        recipientId: recipient.id,
                        campaignId: campaign.id,
                        to: recipient.contact.email,
                        subject: personalizedSubject,
                        html: personalizedContent,
                        senderConfig,
                    },
                });
            } else if (campaign.type === 'SMS') {
                const personalizedMessage = personalizeContent(campaign.content, recipient.contact);

                await queueService.enqueueJob({
                    type: 'sms',
                    payload: {
                        recipientId: recipient.id,
                        campaignId: campaign.id,
                        to: recipient.contact.phone,
                        message: personalizedMessage,
                    },
                });
            }
        }

        res.json({ message: `Retrying ${campaign.recipients.length} failed messages`, count: campaign.recipients.length });
    } catch (error) {
        next(error);
    }
};

export const deleteCampaign = async (req, res, next) => {
    try {
        const { id } = req.params;

        const campaign = await prisma.campaign.findFirst({
            where: { id, organizationId: req.organizationId },
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        await prisma.campaign.delete({ where: { id } });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// Helper function to personalize content with merge tags
function personalizeContent(content, contact) {
    if (!content) return content;

    return content
        .replace(/{{first_name}}/gi, contact.firstName || '')
        .replace(/{{last_name}}/gi, contact.lastName || '')
        .replace(/{{email}}/gi, contact.email || '')
        .replace(/{{phone}}/gi, contact.phone || '');
}

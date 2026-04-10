import prisma from '../config/database.js';
import { buildAnalyticsSnapshot } from '../utils/analytics.js';

export const getDashboard = async (req, res, next) => {
    try {
        const [
            totalContacts,
            totalCampaigns,
            activeCampaigns,
            recentCampaigns,
            contactsByStatus,
            sentCount,
            scheduledCount,
            draftCount,
            failedCount,
            allCampaignStats,
            totalRecipients,
            emailCampaignCount,
            smsCampaignCount,
        ] = await Promise.all([
            prisma.contact.count({
                where: { organizationId: req.organizationId },
            }),
            prisma.campaign.count({
                where: { organizationId: req.organizationId },
            }),
            prisma.campaign.count({
                where: {
                    organizationId: req.organizationId,
                    status: { in: ['SENDING', 'SCHEDULED'] },
                },
            }),
            prisma.campaign.findMany({
                where: { organizationId: req.organizationId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { stats: true },
            }),
            prisma.contact.groupBy({
                by: ['status'],
                where: { organizationId: req.organizationId },
                _count: { status: true },
            }),
            prisma.campaign.count({
                where: { organizationId: req.organizationId, status: 'SENT' },
            }),
            prisma.campaign.count({
                where: { organizationId: req.organizationId, status: 'SCHEDULED' },
            }),
            prisma.campaign.count({
                where: { organizationId: req.organizationId, status: 'DRAFT' },
            }),
            prisma.campaign.count({
                where: { organizationId: req.organizationId, status: 'FAILED' },
            }),
            // Get all campaign stats for this org
            prisma.campaignStats.findMany({
                where: {
                    campaign: { organizationId: req.organizationId },
                },
            }),
            // Total recipients across all campaigns
            prisma.campaignRecipient.count({
                where: {
                    campaign: { organizationId: req.organizationId },
                },
            }),
            prisma.campaign.count({
                where: { organizationId: req.organizationId, type: 'EMAIL' },
            }),
            prisma.campaign.count({
                where: { organizationId: req.organizationId, type: 'SMS' },
            }),
        ]);

        // Calculate aggregate stats from ALL campaigns (not just recent)
        const aggregateStats = allCampaignStats.reduce(
            (acc, stat) => {
                acc.totalSent += stat.sentCount;
                acc.totalDelivered += stat.deliveredCount;
                acc.totalOpened += stat.openedCount;
                acc.totalClicked += stat.clickedCount;
                acc.totalFailed += stat.failedCount;
                acc.totalUnsubscribed += stat.unsubscribedCount;
                acc.totalSpam += stat.spamCount || 0;
                acc.totalForwarded += stat.forwardedCount || 0;
                return acc;
            },
            { totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0, totalFailed: 0, totalUnsubscribed: 0, totalSpam: 0, totalForwarded: 0 }
        );

        const openRate = aggregateStats.totalDelivered > 0
            ? ((aggregateStats.totalOpened / aggregateStats.totalDelivered) * 100).toFixed(2)
            : 0;

        const clickRate = aggregateStats.totalOpened > 0
            ? ((aggregateStats.totalClicked / aggregateStats.totalOpened) * 100).toFixed(1)
            : '0.0';

        res.json({
            overview: {
                totalContacts,
                totalCampaigns,
                activeCampaigns,
                sentCount,
                scheduledCount,
                draftCount,
                failedCount,
                totalRecipients,
                emailCampaignCount,
                smsCampaignCount,
                openRate: `${openRate}%`,
                clickRate: `${clickRate}%`,
            },
            contactsByStatus,
            recentCampaigns,
            aggregateStats,
        });
    } catch (error) {
        next(error);
    }
};

export const getAnalytics = async (req, res, next) => {
    try {
        const campaigns = await prisma.campaign.findMany({
            where: { organizationId: req.organizationId },
            include: { stats: true },
            orderBy: { createdAt: 'desc' },
        });

        const snapshot = buildAnalyticsSnapshot(campaigns);
        res.json(snapshot);
    } catch (error) {
        next(error);
    }
};

export const getRecipientActivity = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, campaignId, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {
            campaign: { organizationId: req.organizationId },
            ...(campaignId && { campaignId }),
            ...(status && { status }),
        };

        const [activities, total] = await Promise.all([
            prisma.campaignRecipient.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    contact: true,
                    campaign: { select: { name: true, type: true } },
                },
            }),
            prisma.campaignRecipient.count({ where }),
        ]);

        res.json({
            activities: activities.map(a => ({
                id: a.id,
                campaignName: a.campaign.name,
                campaignType: a.campaign.type,
                firstName: a.contact.firstName,
                lastName: a.contact.lastName,
                email: a.contact.email,
                phone: a.contact.phone,
                status: a.status,
                timestamp: a.openedAt || a.clickedAt || a.deliveredAt || a.sentAt || a.createdAt,
                details: {
                    sentAt: a.sentAt,
                    deliveredAt: a.deliveredAt,
                    openedAt: a.openedAt,
                    clickedAt: a.clickedAt,
                    failedAt: a.failedAt,
                    spamAt: a.spamAt,
                    forwardedAt: a.forwardedAt,
                    errorMessage: a.errorMessage
                }
            })),
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

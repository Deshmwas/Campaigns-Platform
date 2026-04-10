import prisma from '../config/database.js';

export const getCampaignListStats = async (req, res, next) => {
    try {
        const { organizationId } = req;
        const campaigns = await prisma.campaign.findMany({
            where: { organizationId, status: 'SENT' },
            include: { stats: true },
            orderBy: { sentAt: 'desc' }
        });

        const reportData = campaigns.map(c => {
            const stats = c.stats || {};
            const sent = stats.sentCount || 0;
            const delivered = stats.deliveredCount || 0;
            const opened = stats.openedCount || 0;
            const clicked = stats.clickedCount || 0;

            return {
                id: c.id,
                name: c.name,
                type: c.type,
                sentAt: c.sentAt,
                deliveredRate: sent > 0 ? (delivered / sent) * 100 : 0,
                openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
                clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
                stats: {
                    sent,
                    delivered,
                    opened,
                    clicked
                }
            };
        });

        res.json(reportData);
    } catch (error) {
        next(error);
    }
};

export const getDetailedReport = async (req, res, next) => {
    try {
        const { id } = req.params;
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: { 
                stats: true,
                senderEmail: { select: { email: true, name: true } }
            }
        });

        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        const stats = campaign.stats || {};
        
        // Calculate unopened
        const unopened = Math.max(0, (stats.sentCount || 0) - (stats.openedCount || 0));

        // Time series data (last 24-48 hours usually for a recent campaign)
        const interactions = await prisma.campaignInteraction.findMany({
            where: { recipient: { campaignId: id } },
            orderBy: { timestamp: 'asc' },
            select: { type: true, timestamp: true, metadata: true }
        });

        // Group by hour for the chart
        const timeSeries = groupInteractionsByHour(interactions);

        res.json({
            campaign: {
                id: campaign.id,
                name: campaign.name,
                type: campaign.type,
                subject: campaign.subject,
                sentAt: campaign.sentAt,
                sender: campaign.senderEmail
            },
            metrics: {
                sent: stats.sentCount || 0,
                delivered: stats.deliveredCount || 0,
                opened: stats.openedCount || 0,
                unopened,
                clicked: stats.clickedCount || 0,
                unsubscribed: stats.unsubscribedCount || 0,
                spam: stats.spamCount || 0,
                forwarded: stats.forwardedCount || 0,
                reliableOpens: stats.reliableOpenedCount || 0,
                mppOpens: stats.appleMppOpenedCount || 0,
                replies: stats.replyCount || 0
            },
            charts: {
                timeSeries,
                engagement: [
                    { name: 'Opened', value: stats.openedCount || 0 },
                    { name: 'Unopened', value: unopened }
                ],
                clicks: [
                    { name: 'Clicked', value: stats.clickedCount || 0 },
                    { name: 'Not Clicked', value: (stats.openedCount || 0) - (stats.clickedCount || 0) }
                ]
            }
        });
    } catch (error) {
        next(error);
    }
};

function groupInteractionsByHour(interactions) {
    const groups = {};
    interactions.forEach(i => {
        if (i.type !== 'OPEN' && i.type !== 'CLICK') return;
        const date = new Date(i.timestamp);
        date.setMinutes(0, 0, 0);
        const key = date.toISOString();
        if (!groups[key]) groups[key] = { timestamp: key, opens: 0, clicks: 0 };
        if (i.type === 'OPEN') groups[key].opens++;
        if (i.type === 'CLICK') groups[key].clicks++;
    });
    return Object.values(groups).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

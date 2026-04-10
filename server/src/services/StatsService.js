import prisma from '../config/database.js';

class StatsService {
    /**
     * Fully recalculates and syncs stats for a specific campaign.
     * This is an expensive operation but ensures 100% accuracy.
     */
    async updateStats(campaignId) {
        if (!campaignId) return;

        try {
            const stats = await prisma.campaignRecipient.groupBy({
                by: ['status'],
                where: { campaignId },
                _count: { status: true },
            });

            const statsObj = {
                sentCount: 0,
                deliveredCount: 0,
                openedCount: 0,
                clickedCount: 0,
                failedCount: 0,
                unsubscribedCount: 0,
                spamCount: 0,
                forwardedCount: 0,
                reliableOpenedCount: 0,
                appleMppOpenedCount: 0,
                replyCount: 0,
            };

            stats.forEach(stat => {
                switch (stat.status) {
                    case 'SENT':
                    case 'DELIVERED':
                        statsObj.sentCount += stat._count.status;
                        if (stat.status === 'DELIVERED') statsObj.deliveredCount += stat._count.status;
                        break;
                    case 'OPENED':
                        statsObj.sentCount += stat._count.status;
                        statsObj.deliveredCount += stat._count.status;
                        statsObj.openedCount += stat._count.status;
                        break;
                    case 'CLICKED':
                        statsObj.sentCount += stat._count.status;
                        statsObj.deliveredCount += stat._count.status;
                        statsObj.openedCount += stat._count.status;
                        statsObj.clickedCount += stat._count.status;
                        break;
                    case 'FAILED':
                        statsObj.failedCount += stat._count.status;
                        break;
                    case 'UNSUBSCRIBED':
                        statsObj.unsubscribedCount += stat._count.status;
                        break;
                    case 'SPAM':
                        statsObj.spamCount += stat._count.status;
                        break;
                    case 'FORWARDED':
                        statsObj.forwardedCount += stat._count.status;
                        break;
                }
            });

            // Additionally sync specific counts from the interactions table for accuracy
            const interactionCounts = await prisma.campaignInteraction.groupBy({
                by: ['type', 'metadata'],
                where: { recipient: { campaignId } },
                _count: { id: true }
            });

            interactionCounts.forEach(group => {
                if (group.type === 'OPEN') {
                    const isMpp = group.metadata?.isMpp;
                    if (isMpp) statsObj.appleMppOpenedCount += group._count.id;
                    else statsObj.reliableOpenedCount += group._count.id;
                } else if (group.type === 'REPLY') {
                    statsObj.replyCount += group._count.id;
                }
            });

            const totalRecipients = await prisma.campaignRecipient.count({ where: { campaignId } });

            await prisma.campaignStats.upsert({
                where: { campaignId },
                create: {
                    campaignId,
                    totalRecipients,
                    ...statsObj,
                },
                update: statsObj,
            });

            console.log(`[Stats] Synchronized stats for campaign ${campaignId}`);

            // Update campaign status if all recipients are processed
            const totalProcessed = stats.reduce((sum, s) => {
                if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'FAILED', 'UNSUBSCRIBED', 'SPAM', 'FORWARDED'].includes(s.status)) {
                    return sum + s._count.status;
                }
                return sum;
            }, 0);

            if (totalProcessed === totalRecipients && totalRecipients > 0) {
                const allFailed = statsObj.failedCount === totalRecipients;
                await prisma.campaign.updateMany({
                    where: { id: campaignId, status: 'SENDING' },
                    data: { status: allFailed ? 'FAILED' : 'SENT' },
                });
            }
        } catch (error) {
            console.error(`[Stats] Failed to update stats for campaign ${campaignId}:`, error.message);
        }
    }

    /**
     * Records a specific interaction (OPEN or CLICK) and updates stats efficiently.
     * Handles implicit state transitions (e.g., CLICK implies OPEN).
     */
    async recordInteraction(recipientId, type, { userAgent = null, ipAddress = null, url = null } = {}) {
        try {
            const recipient = await prisma.campaignRecipient.findUnique({
                where: { id: recipientId },
                select: { campaignId: true, status: true, openedAt: true, clickedAt: true }
            });

            if (!recipient) return;

            const now = new Date();
            const updates = {};
            let statusChanged = false;

            if (type === 'OPEN') {
                const isMpp = userAgent && (userAgent.includes('AppleNews') || userAgent.includes('Cloudfront')); // Simplified MPP detection
                
                await prisma.campaignInteraction.create({
                    data: {
                        recipientId,
                        type: 'OPEN',
                        userAgent,
                        ipAddress,
                        metadata: { isMpp }
                    }
                });

                if (!recipient.openedAt) {
                    updates.openedAt = now;
                    if (['SENT', 'DELIVERED'].includes(recipient.status)) {
                        updates.status = 'OPENED';
                        statusChanged = true;
                    }
                }
            } else if (type === 'CLICK') {
                await prisma.campaignInteraction.create({
                    data: {
                        recipientId,
                        type: 'CLICK',
                        url,
                        userAgent,
                        ipAddress
                    }
                });

                if (!recipient.clickedAt) {
                    updates.clickedAt = now;
                    updates.status = 'CLICKED';
                    statusChanged = true;
                    if (!recipient.openedAt) {
                        updates.openedAt = now;
                    }
                }
            } else if (type === 'REPLY') {
                await prisma.campaignInteraction.create({
                    data: {
                        recipientId,
                        type: 'REPLY',
                        userAgent,
                        ipAddress
                    }
                });
                // No specific status for reply in current enum, but we track it in stats
            } else if (type === 'SPAM') {
                await prisma.campaignInteraction.create({
                    data: { recipientId, type: 'SPAM', userAgent, ipAddress }
                });
                if (!recipient.spamAt) {
                    updates.spamAt = now;
                    updates.status = 'SPAM';
                    statusChanged = true;
                }
            } else if (type === 'FORWARD') {
                await prisma.campaignInteraction.create({
                    data: { recipientId, type: 'FORWARD', userAgent, ipAddress }
                });
                if (!recipient.forwardedAt) {
                    updates.forwardedAt = now;
                    updates.status = 'FORWARDED';
                    statusChanged = true;
                }
            }

            if (Object.keys(updates).length > 0) {
                await prisma.campaignRecipient.update({
                    where: { id: recipientId },
                    data: updates
                });

                // After a specific interaction, it's safer to recalculate full stats 
                // to ensure everything stays in sync, or we can do incremental logic.
                // For now, full sync is safer for small/medium scale.
                await this.updateStats(recipient.campaignId);
            }
        } catch (error) {
            console.error(`[Stats] Failed to record ${type} for recipient ${recipientId}:`, error.message);
        }
    }
}

export default new StatsService();

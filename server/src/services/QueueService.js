import prisma from '../config/database.js';
import emailEngine from './EmailEngine.js';
import smsEngine from './SmsEngine.js';

class QueueService {
    constructor() {
        this.isProcessing = false;
        this.pollingInterval = 1000; // Check for jobs every second
        this.concurrentJobs = 5; // Process up to 5 jobs concurrently
        this.timer = null;
    }

    async start() {
        if (this.isProcessing) {
            console.log('⚠️  Queue processor already running');
            return;
        }

        this.isProcessing = true;
        console.log('🚀 Queue processor started');

        this.processLoop();
    }

    async processLoop() {
        while (this.isProcessing) {
            try {
                await this.processPendingJobs();
                await this.retryFailedJobs();
                await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
            } catch (error) {
                console.error('Queue processing error:', error);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    async processPendingJobs() {
        const takeAmount = process.env.VERCEL ? 100 : this.concurrentJobs;
        
        const jobs = await prisma.jobQueue.findMany({
            where: {
                status: 'PENDING',
                scheduledAt: { lte: new Date() },
            },
            take: takeAmount,
            orderBy: { scheduledAt: 'asc' },
        });

        if (jobs.length === 0) return;

        console.log(`📦 Processing ${jobs.length} pending job(s)...`);

        await Promise.allSettled(jobs.map(job => this.processJob(job)));
    }
    async retryFailedJobs() {
        const retryableJobs = await prisma.jobQueue.findMany({
            where: {
                status: 'FAILED',
                attempts: { lt: prisma.jobQueue.fields.maxAttempts },
            },
            take: this.concurrentJobs,
            orderBy: { failedAt: 'asc' },
        });

        if (retryableJobs.length > 0) {
            console.log(`ðŸ” Retrying ${retryableJobs.length} failed job(s)...`);
            await Promise.allSettled(retryableJobs.map(job => this.processJob(job)));
        }
    }

    async processJob(job) {
        try {
            await prisma.jobQueue.update({
                where: { id: job.id },
                data: {
                    status: 'PROCESSING',
                    startedAt: new Date(),
                    attempts: { increment: 1 },
                },
            });

            const { recipientId } = job.payload;

            if (recipientId) {
                const recipient = await prisma.campaignRecipient.findUnique({
                    where: { id: recipientId },
                    include: { contact: true },
                });

                if (!recipient || !recipient.contact) {
                    throw new Error('Recipient or Contact not found');
                }

                if (['UNSUBSCRIBED', 'BOUNCED', 'BLACKLISTED'].includes(recipient.contact.status)) {
                    console.log(`🚫 Skipping job ${job.id}: Contact is ${recipient.contact.status}`);

                    await prisma.campaignRecipient.update({
                        where: { id: recipientId },
                        data: {
                            status: 'FAILED',
                            failedAt: new Date(),
                            errorMessage: `Skipped: Contact is ${recipient.contact.status}`,
                        },
                    });

                    await prisma.jobQueue.update({
                        where: { id: job.id },
                        data: {
                            status: 'COMPLETED',
                            completedAt: new Date(),
                        },
                    });

                    return;
                }
            }

            let result;
            if (job.type === 'email') {
                result = await this.processEmailJob(job);
            } else if (job.type === 'sms') {
                result = await this.processSmsJob(job);
            } else {
                throw new Error(`Unknown job type: ${job.type}`);
            }

            await prisma.jobQueue.update({
                where: { id: job.id },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                },
            });

            console.log(`✅ Job ${job.id} completed`);
            return result;
        } catch (error) {
            console.error(`❌ Job ${job.id} failed:`, error.message);

            const shouldRetry = !error.noRetry && (job.attempts + 1 < job.maxAttempts);

            await prisma.jobQueue.update({
                where: { id: job.id },
                data: {
                    status: shouldRetry ? 'RETRYING' : 'FAILED',
                    failedAt: new Date(),
                    error: error.message,
                },
            });

            if (job.payload.recipientId) {
                await prisma.campaignRecipient.update({
                    where: { id: job.payload.recipientId },
                    data: {
                        status: 'FAILED',
                        failedAt: new Date(),
                        errorMessage: error.message,
                    },
                });

                await this.updateCampaignStats(job.payload.campaignId);
            }
        }
    }

    async processEmailJob(job) {
        const { recipientId, campaignId, to, subject, html, text, senderConfig } = job.payload;

        const result = await emailEngine.send({
            to,
            subject,
            html,
            text,
            campaignId,
            recipientId,
            senderConfig,
        });

        await prisma.campaignRecipient.update({
            where: { id: recipientId },
            data: {
                status: 'DELIVERED',
                sentAt: new Date(),
                deliveredAt: new Date(),
            },
        });

        await this.updateCampaignStats(campaignId);

        return result;
    }

    async processSmsJob(job) {
        const { recipientId, campaignId, to, message } = job.payload;

        // Fetch organization settings for this campaign
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { organization: true }
        });

        const gatewayConfig = campaign?.organization?.settings || {};

        const result = await smsEngine.send({
            to,
            message,
            campaignId,
            recipientId,
            gatewayConfig,
        });

        const statusMap = {
            delivered: 'DELIVERED',
            sent: 'SENT',
            failed: 'FAILED',
        };

        const newStatus = statusMap[result.status] || 'SENT';

        await prisma.campaignRecipient.update({
            where: { id: recipientId },
            data: {
                status: newStatus,
                sentAt: new Date(),
                deliveredAt: newStatus === 'DELIVERED' ? new Date() : null,
                failedAt: newStatus === 'FAILED' ? new Date() : null,
                errorMessage: result.error || null,
            },
        });

        await this.updateCampaignStats(campaignId);

        return result;
    }

    async updateCampaignStats(campaignId) {
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

        const totalProcessed = stats.reduce((sum, s) => {
            if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'FAILED', 'UNSUBSCRIBED', 'BOUNCED'].includes(s.status)) {
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
    }

    async enqueueJob({ type, payload, scheduledAt = new Date() }) {
        return prisma.jobQueue.create({
            data: {
                type,
                payload,
                scheduledAt,
                status: 'PENDING',
            },
        });
    }

    async stop() {
        console.log('🛑 Stopping queue processor...');
        this.isProcessing = false;
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }
}

export default new QueueService();

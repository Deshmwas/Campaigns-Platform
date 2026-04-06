const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
    try {
        console.log('--- Inspecting Campaigns ---');
        const campaigns = await prisma.campaign.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { _count: { select: { recipients: true } } }
        });

        if (campaigns.length === 0) {
            console.log('❌ No campaigns found.');
            return;
        }

        console.table(campaigns.map(c => ({
            id: c.id.slice(0, 8) + '...',
            name: c.name,
            status: c.status,
            recipients: c._count.recipients,
            scheduledAt: c.scheduledAt,
            createdAt: c.createdAt
        })));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

inspect();

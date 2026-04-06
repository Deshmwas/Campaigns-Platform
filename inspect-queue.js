const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
    try {
        console.log('--- Inspecting Job Queue ---');
        const now = new Date();
        console.log('Current Server Time:', now.toISOString());

        const jobs = await prisma.jobQueue.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        if (jobs.length === 0) {
            console.log('❌ No jobs found in the queue.');
            return;
        }

        console.table(jobs.map(j => ({
            id: j.id.slice(0, 8) + '...',
            type: j.type,
            status: j.status,
            scheduledAt: j.scheduledAt,
            createdAt: j.createdAt,
            isDue: j.scheduledAt <= now ? '✅ YES' : '❌ NO'
        })));

        const pendingDue = jobs.filter(j => j.status === 'PENDING' && j.scheduledAt <= now);
        console.log(`\nFound ${pendingDue.length} jobs that are PENDING and DUE.`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

inspect();

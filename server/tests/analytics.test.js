import { buildAnalyticsSnapshot } from '../src/utils/analytics.js';

describe('buildAnalyticsSnapshot', () => {
    const campaigns = [
        {
            name: 'Email One',
            type: 'EMAIL',
            status: 'SENT',
            stats: {
                sentCount: 10,
                deliveredCount: 9,
                openedCount: 5,
                clickedCount: 2,
                failedCount: 1,
                unsubscribedCount: 0,
                totalRecipients: 10,
            },
        },
        {
            name: 'SMS One',
            type: 'SMS',
            status: 'FAILED',
            stats: {
                sentCount: 5,
                deliveredCount: 3,
                openedCount: 0,
                clickedCount: 0,
                failedCount: 2,
                unsubscribedCount: 0,
                totalRecipients: 5,
            },
        },
    ];

    it('aggregates totals and rates correctly', () => {
        const snapshot = buildAnalyticsSnapshot(campaigns);

        expect(snapshot.totals.totalSent).toBe(15);
        expect(snapshot.totals.totalDelivered).toBe(12);
        expect(snapshot.totals.totalFailed).toBe(3);
        expect(snapshot.totals.totalCampaigns).toBe(2);
        expect(snapshot.totals.sentCampaigns).toBe(1);
        expect(snapshot.totals.failedCampaigns).toBe(1);
        expect(snapshot.totals.emailSent).toBe(10);
        expect(snapshot.totals.smsSent).toBe(5);

        expect(snapshot.campaignTypes.find(c => c.name === 'Email')?.value).toBe(1);
        expect(snapshot.campaignTypes.find(c => c.name === 'SMS')?.value).toBe(1);
        expect(snapshot.performance.length).toBe(2);
    });
});

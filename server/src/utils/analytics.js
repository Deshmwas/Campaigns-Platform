export function buildAnalyticsSnapshot(campaigns = []) {
    const totals = campaigns.reduce(
        (acc, c) => {
            const stats = c.stats || {};
            acc.totalSent += stats.sentCount || 0;
            acc.totalDelivered += stats.deliveredCount || 0;
            acc.totalOpened += stats.openedCount || 0;
            acc.totalClicked += stats.clickedCount || 0;
            acc.totalFailed += stats.failedCount || 0;
            acc.totalUnsubscribed += stats.unsubscribedCount || 0;
            acc.totalRecipients += stats.totalRecipients || 0;
            acc.totalCampaigns += 1;
            acc.sentCampaigns += c.status === 'SENT' ? 1 : 0;
            acc.failedCampaigns += c.status === 'FAILED' ? 1 : 0;
            acc.emailSent += c.type === 'EMAIL' ? (stats.sentCount || 0) : 0;
            acc.smsSent += c.type === 'SMS' ? (stats.sentCount || 0) : 0;
            return acc;
        },
        {
            totalSent: 0,
            totalDelivered: 0,
            totalOpened: 0,
            totalClicked: 0,
            totalFailed: 0,
            totalUnsubscribed: 0,
            totalRecipients: 0,
            totalCampaigns: 0,
            sentCampaigns: 0,
            failedCampaigns: 0,
            emailSent: 0,
            smsSent: 0,
        }
    );

    const emailCampaigns = campaigns.filter(c => c.type === 'EMAIL');
    const smsCampaigns = campaigns.filter(c => c.type === 'SMS');

    const performance = campaigns.slice(0, 8).reverse().map(c => ({
        name: c.name.length > 15 ? `${c.name.substring(0, 15)}...` : c.name,
        sent: c.stats?.sentCount || 0,
        delivered: c.stats?.deliveredCount || 0,
        opened: c.stats?.openedCount || 0,
        clicked: c.stats?.clickedCount || 0,
        failed: c.stats?.failedCount || 0,
    }));

    const totalAttempts = totals.totalSent + totals.totalFailed;
    const sentDenominator = totals.totalSent || 1;

    return {
        totals,
        openRate: totals.totalSent > 0 ? ((totals.totalOpened / totals.totalSent) * 100).toFixed(1) : '0.0',
        clickRate: totals.totalOpened > 0 ? ((totals.totalClicked / totals.totalOpened) * 100).toFixed(1) : '0.0',
        failRate: totalAttempts > 0 ? ((totals.totalFailed / sentDenominator) * 100).toFixed(1) : '0',
        unsubRate: totals.totalDelivered > 0 ? ((totals.totalUnsubscribed / totals.totalDelivered) * 100).toFixed(1) : '0',
        deliveryRate: totals.totalSent > 0 ? ((totals.totalDelivered / totals.totalSent) * 100).toFixed(1) : '0',
        campaignTypes: [
            { name: 'Email', value: emailCampaigns.length || 0 },
            { name: 'SMS', value: smsCampaigns.length || 0 },
        ],
        performance,
    };
}

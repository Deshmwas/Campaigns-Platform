import { describe, expect, test, jest, beforeEach } from '@jest/globals';

const mockPrismaClient = {
    campaign: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    contact: {
        findMany: jest.fn(),
    },
    campaignRecipient: {
        createMany: jest.fn(),
        count: jest.fn(),
    },
    campaignStats: {
        create: jest.fn(),
        findMany: jest.fn(),
    }
};

jest.unstable_mockModule('../src/config/database.js', () => ({
    default: mockPrismaClient,
}));

const { getCampaigns, createCampaign } = await import('../src/controllers/campaignController.js');
const { getAnalytics } = await import('../src/controllers/dashboardController.js');
const { default: prisma } = await import('../src/config/database.js');

describe('Campaigns Module Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            organizationId: 'org-1',
            query: {},
            body: {},
            params: {}
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Campaign Listing (getCampaigns)', () => {
        test('should return paginated campaigns successfully', async () => {
            req.query = { page: '1', limit: '10' };
            
            const mockCampaigns = [{ id: 'camp-1', name: 'Test Campaign', type: 'EMAIL' }];
            prisma.campaign.findMany.mockResolvedValue(mockCampaigns);
            prisma.campaign.count.mockResolvedValue(1);

            await getCampaigns(req, res, next);

            expect(prisma.campaign.findMany).toHaveBeenCalledWith(expect.objectContaining({
                skip: 0,
                take: 10,
                where: { organizationId: 'org-1' }
            }));
            expect(res.json).toHaveBeenCalledWith({
                campaigns: mockCampaigns,
                pagination: { page: 1, limit: 10, total: 1, pages: 1 }
            });
        });
    });

    describe('Campaign Creation (createCampaign)', () => {
        test('should create an EMAIL campaign and initialize recipients and stats', async () => {
            req.body = {
                name: 'Promo Email',
                type: 'EMAIL',
                subject: 'Huge Sale!',
                content: '<p>Hi</p>',
                listIds: ['list-1']
            };

            const mockCampaign = { id: 'new-camp-1', name: 'Promo Email', type: 'EMAIL' };
            prisma.campaign.create.mockResolvedValue(mockCampaign);
            prisma.contact.findMany.mockResolvedValue([{ id: 'contact-1', email: 'test@test.com' }]);
            prisma.campaignRecipient.createMany.mockResolvedValue({ count: 1 });
            prisma.campaignStats.create.mockResolvedValue({});

            await createCampaign(req, res, next);

            expect(prisma.campaign.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'Promo Email',
                    type: 'EMAIL',
                    status: 'DRAFT'
                })
            });
            expect(prisma.contact.findMany).toHaveBeenCalled();
            expect(prisma.campaignRecipient.createMany).toHaveBeenCalledWith({
                data: [{ campaignId: 'new-camp-1', contactId: 'contact-1' }]
            });
            expect(prisma.campaignStats.create).toHaveBeenCalledWith({
                data: { campaignId: 'new-camp-1', totalRecipients: 1 }
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockCampaign);
        });

        test('should fail to create EMAIL campaign without a subject', async () => {
             req.body = {
                name: 'Bad Email',
                type: 'EMAIL',
                content: '<p>Hi</p>',
            };

            await createCampaign(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Subject is required for email campaigns' });
            expect(prisma.campaign.create).not.toHaveBeenCalled();
        });

        test('should create an SMS campaign successfully', async () => {
            req.body = {
                name: 'Promo SMS',
                type: 'SMS',
                content: 'Use code 20OFF',
                listIds: ['list-1']
            };

            const mockCampaign = { id: 'new-camp-2', name: 'Promo SMS', type: 'SMS' };
            prisma.campaign.create.mockResolvedValue(mockCampaign);
            prisma.contact.findMany.mockResolvedValue([{ id: 'contact-2', phone: '+1234567890' }]);
            prisma.campaignRecipient.createMany.mockResolvedValue({ count: 1 });
            prisma.campaignStats.create.mockResolvedValue({});

            await createCampaign(req, res, next);

            expect(prisma.campaign.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'Promo SMS',
                    type: 'SMS',
                    status: 'DRAFT'
                })
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockCampaign);
        });
    });

    describe('Campaign Reports (getAnalytics)', () => {
        test('should aggregate metrics correctly for dashboard reports', async () => {
            prisma.campaign.findMany.mockResolvedValue([
                {
                    id: 'c1', type: 'EMAIL', status: 'SENT', name: 'Email 1',
                    stats: { sentCount: 100, deliveredCount: 90, openedCount: 50, clickedCount: 10, failedCount: 10, totalRecipients: 100 }
                },
                {
                    id: 'c2', type: 'SMS', status: 'SENT', name: 'SMS 1',
                    stats: { sentCount: 200, deliveredCount: 190, openedCount: 0, clickedCount: 0, failedCount: 10, totalRecipients: 200 }
                }
            ]);

            await getAnalytics(req, res, next);

            expect(prisma.campaign.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { organizationId: 'org-1' }
            }));

            // Validate that we correctly aggregate SMS and Email stats together
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                totals: expect.objectContaining({
                    totalSent: 300,
                    totalDelivered: 280,
                    totalOpened: 50,
                    totalClicked: 10,
                    totalFailed: 20,
                    totalRecipients: 300,
                    totalCampaigns: 2,
                    emailSent: 100,
                    smsSent: 200
                }),
                openRate: "16.7", // 50 / 300 * 100 = 16.666
                clickRate: "3.3",  // 10 / 300 * 100 = 3.333
                deliveryRate: "93.3", // 280 / 300 * 100 = 93.333
            }));
        });
    });
});


import { describe, expect, test, jest, beforeEach, beforeAll } from '@jest/globals';

// We need to disable the real database connection for tests
// Using unstable_mockModule for ESM support

const mockPrismaClient = {
    contactList: {
        findFirst: jest.fn(),
    },
    contactListMembership: {
        findMany: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
    },
    jobQueue: {
        update: jest.fn(),
        create: jest.fn(),
    },
    campaignRecipient: {
        findUnique: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn(),
    },
    campaignStats: {
        upsert: jest.fn(),
    }
};

// Must be called before imports
jest.unstable_mockModule('../src/config/database.js', () => ({
    default: mockPrismaClient,
}));

// Dynamic imports are required after mocking
const { mergeLists } = await import('../src/controllers/listController.js');
const { default: queueService } = await import('../src/services/QueueService.js');
const { default: prisma } = await import('../src/config/database.js');

describe('Business Logic Tests', () => {

    describe('List Merge Logic', () => {
        let req, res, next;

        beforeEach(() => {
            req = {
                params: { targetListId: 'target-1' },
                body: { sourceListIds: ['source-1', 'source-2'] },
                organizationId: 'org-1'
            };
            res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis(),
            };
            next = jest.fn();
            jest.clearAllMocks();
        });

        test('should merge unique contacts from source lists into target list', async () => {
            // Mock target list exists
            prisma.contactList.findFirst.mockResolvedValue({ id: 'target-1' });

            // Mock finding source memberships
            prisma.contactListMembership.findMany.mockResolvedValue([
                { contactId: 'contact-A' },
                { contactId: 'contact-B' },
            ]);

            // Mock createMany
            prisma.contactListMembership.createMany.mockResolvedValue({ count: 2 });

            await mergeLists(req, res, next);

            // Verify findMany called with distinct
            expect(prisma.contactListMembership.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    listId: { in: ['source-1', 'source-2'] },
                    list: { organizationId: 'org-1' }
                },
                distinct: ['contactId']
            }));

            // Verify createMany called with skipDuplicates: true
            expect(prisma.contactListMembership.createMany).toHaveBeenCalledWith(expect.objectContaining({
                skipDuplicates: true
            }));

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                merged: 2
            }));
        });
    });

    describe('Campaign Sending Audit (Unsubscribe Check)', () => {
        test('should skip sending if contact is UNSUBSCRIBED', async () => {
            const job = {
                id: 'job-1',
                type: 'email',
                attempts: 0,
                maxAttempts: 3,
                payload: {
                    recipientId: 'recipient-1',
                    campaignId: 'camp-1',
                    to: 'test@example.com'
                }
            };

            // Mock finding recipient with UNSUBSCRIBED status
            prisma.campaignRecipient.findUnique.mockResolvedValue({
                id: 'recipient-1',
                contact: {
                    id: 'contact-1',
                    status: 'UNSUBSCRIBED'
                }
            });

            await queueService.processJob(job);

            // Should update recipient as FAILED
            expect(prisma.campaignRecipient.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'recipient-1' },
                data: expect.objectContaining({
                    status: 'FAILED',
                    errorMessage: expect.stringContaining('Skipped')
                })
            }));
        });
    });
});

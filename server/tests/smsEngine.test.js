import { SmsEngine, SmsValidationError } from '../src/services/SmsEngine.js';

describe('SmsEngine', () => {
    const gateway = 'logger';
    let engine;

    beforeAll(async () => {
        process.env.SMS_GATEWAY = gateway;
        engine = new SmsEngine();
        await engine.initialize();
    });

    afterAll(async () => {
        await engine.close();
    });

    test('validates phone numbers with country code', () => {
        expect(engine.cleanPhoneNumber('+254712345678')).toBe('+254712345678');
        expect(engine.cleanPhoneNumber('0712345678')).toBeNull();
    });

    test('throws SmsValidationError for invalid phone numbers', async () => {
        await expect(engine.send({ to: '0712', message: 'Hello' })).rejects.toBeInstanceOf(SmsValidationError);
    });

    test('returns status and messageId when sending via logger gateway', async () => {
        const result = await engine.send({
            to: '+254712345678',
            message: 'Test message',
            campaignId: 'cmp-1',
            recipientId: 'rcp-1',
        });

        expect(result.messageId).toBeTruthy();
        expect(['sent', 'delivered']).toContain(result.status);
        expect(result.charCount).toBeGreaterThan(0);
    });
});

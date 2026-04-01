import { config } from '../config/index.js';

class SmsValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SmsValidationError';
        this.noRetry = true;
    }
}

class SmsEngine {
    constructor() {
        this.gatewayType = process.env.SMS_GATEWAY || 'logger'; // logger, smpp, http
        this.isReady = false;
        this.rateLimiter = {
            count: 0,
            resetAt: Date.now() + 60000,
        };
    }

    async initialize() {
        this.gateways = {
            logger: new LoggerGateway(),
            smpp: new SMPPGateway(),
            http: new HttpGateway(),
        };

        await Promise.all([
            this.gateways.logger.initialize(),
            this.gateways.http.initialize(),
        ]);

        this.isReady = true;
        console.log(`SMS engine initialized (default gateway=${this.gatewayType})`);
    }

    async canSend() {
        const now = Date.now();

        if (now > this.rateLimiter.resetAt) {
            this.rateLimiter.count = 0;
            this.rateLimiter.resetAt = now + 60000;
        }

        if (this.rateLimiter.count >= config.rateLimits.sms) {
            const waitTime = this.rateLimiter.resetAt - now;
            return { allowed: false, waitTime };
        }

        return { allowed: true };
    }

    async send({ to, message, campaignId, recipientId, gatewayConfig }) {
        const { allowed, waitTime } = await this.canSend();
        if (!allowed) {
            throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(waitTime / 1000)}s`);
        }

        const cleanedPhone = this.cleanPhoneNumber(to);
        if (!cleanedPhone) {
            throw new SmsValidationError('Invalid phone number format. Include country code, e.g. +2547xxxxxxx');
        }

        const charCount = message.length;
        const messageCount = Math.ceil(charCount / 160);

        // Determine which gateway to use
        const type = gatewayConfig?.smsGateway || this.gatewayType;
        const gateway = this.gateways[type] || this.gateways.logger;

        try {
            const result = await gateway.send({
                to: cleanedPhone,
                message,
                campaignId,
                recipientId,
                gatewayConfig,
            });

            this.rateLimiter.count++;

            console.log(
                `SMS dispatched to ${cleanedPhone} (${charCount} chars / ${messageCount} segment${messageCount > 1 ? 's' : ''}) status=${result.status}`
            );

            return {
                success: true,
                messageId: result.messageId,
                status: result.status,
                charCount,
                messageCount,
                providerResponse: result.response || null,
            };
        } catch (error) {
            console.error(`SMS send failed to ${cleanedPhone}:`, error.message);
            throw error;
        }
    }

    cleanPhoneNumber(phone) {
        const cleaned = phone.replace(/[^\d+]/g, '');

        // Require leading + (country code) and 10-15 digits
        if (cleaned.match(/^\+\d{10,15}$/)) {
            return cleaned;
        }

        return null;
    }

    async close() {
        for (const gateway of Object.values(this.gateways)) {
            if (gateway.close) await gateway.close();
        }
        console.log('SMS engine closed');
    }
}

// ============================================
// GATEWAY IMPLEMENTATIONS
// ============================================

class LoggerGateway {
    async initialize() {
        console.log('Logger Gateway initialized (simulated SMS)');
    }

    async send({ to, message, campaignId, gatewayConfig }) {
        console.log('--------------------------------------------------');
        console.log('[SIMULATED SMS OUTPUT]');
        console.log(`To: ${to}`);
        console.log(`Message: ${message}`);
        console.log(`Campaign: ${campaignId || 'N/A'}`);
        console.log(`Gateway: ${gatewayConfig?.smsGateway || 'logger (default)'}`);
        console.log('STATUS: Success (Simulation)');
        console.log('--------------------------------------------------');

        return {
            messageId: `simulated-${Date.now()}`,
            status: 'delivered',
        };
    }
}

class SMPPGateway {
    async initialize() {
        console.log('SMPP Gateway initialized (placeholder)');
        throw new Error('SMPP Gateway not yet implemented');
    }

    async send() {
        throw new Error('SMPP Gateway not yet implemented');
    }
}

class HttpGateway {
    async initialize() {
        this.apiUrl = process.env.SMS_API_URL || 'https://api.sandbox.africastalking.com/version1/messaging';
        this.apiKey = process.env.SMS_API_KEY || 'sandbox';
        this.username = process.env.SMS_USERNAME || 'sandbox';

        console.log(`HTTP Gateway initialized (target=${this.apiUrl})`);
    }

    async send({ to, message, gatewayConfig }) {
        const apiUrl = gatewayConfig?.smsApiUrl || this.apiUrl;
        const apiKey = gatewayConfig?.smsApiKey || this.apiKey;
        const username = gatewayConfig?.smsUsername || this.username;

        try {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('to', to);
            params.append('message', message);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'apiKey': apiKey,
                    'Accept': 'application/json',
                },
                body: params.toString(),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`HTTP Gateway rejected payload (status ${response.status}): ${errorText}`);
                return { status: 'failed', error: errorText };
            }

            const data = await response.json().catch(() => ({}));
            const providerStatus = this.mapProviderStatus(data);

            return {
                messageId: data.MessageId || `http-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                status: providerStatus,
                response: data,
            };
        } catch (error) {
            console.error('HTTP Gateway network error:', error);
            throw new Error(`SMS network request failed: ${error.message}`);
        }
    }

    mapProviderStatus(data) {
        // Africa's Talking style response: SMSMessageData.Recipients[0].status / statusCode
        const recipient = data?.SMSMessageData?.Recipients?.[0];
        const status = recipient?.status?.toString().toLowerCase();
        const code = Number(recipient?.statusCode);

        if (status) {
            if (status.includes('delivered')) return 'delivered';
            if (status.includes('success') || status.includes('accepted')) return 'sent';
            if (status.includes('failed') || status.includes('rejected')) return 'failed';
        }

        if (!Number.isNaN(code) && code >= 400) return 'failed';

        return 'sent'; // default optimistic: accepted for delivery
    }
}

export { SmsEngine, SmsValidationError };
export default new SmsEngine();

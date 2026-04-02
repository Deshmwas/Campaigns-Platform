import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import emailEngine from './services/EmailEngine.js';
import smsEngine from './services/SmsEngine.js';
import queueService from './services/QueueService.js';

// Routes
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import listRoutes from './routes/lists.js';
import campaignRoutes from './routes/campaigns.js';
import templateRoutes from './routes/templates.js';
import userRoutes from './routes/users.js';
import organizationRoutes from './routes/organization.js';
import trackingRoutes from './routes/tracking.js';
import dashboardRoutes from './routes/dashboard.js';
import senderRoutes from './routes/senders.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded content
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/track', trackingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/senders', senderRoutes);

// Error handling
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
    try {
        console.log('🚀 Starting Campaigns Server...');

        // Database Pre-flight Sync (Ensures tables exist on Render/Production)
        console.log('📦 Syncing database schema...');
        try {
            execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
            console.log('✅ Database schema synced');
        } catch (dbError) {
            console.error('⚠️  Database sync failed:', dbError.message);
            // Continue anyway, as the tables might already exist
        }

        // Initialize Email Engine
        await emailEngine.initialize();

        // Initialize SMS Engine
        await smsEngine.initialize();

        // Start Queue Processor
        await queueService.start();

        // Start HTTP server
        const server = app.listen(config.port, () => {
            console.log(`✅ Server running on port ${config.port}`);
            console.log(`📍 API URL: ${config.app.apiUrl}`);
            console.log(`🌐 Environment: ${config.nodeEnv}`);
        });

        // Graceful shutdown
        const shutdown = async (signal) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);

            server.close(async () => {
                console.log('HTTP server closed');

                await queueService.stop();
                await emailEngine.close();
                await smsEngine.close();

                console.log('✅ Shutdown complete');
                process.exit(0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                console.error('⚠️  Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

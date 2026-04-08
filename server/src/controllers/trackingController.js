import prisma from '../config/database.js';

export const trackOpen = async (req, res) => {
    try {
        const { recipientId } = req.params;

        const result = await prisma.campaignRecipient.updateMany({
            where: {
                id: recipientId,
                openedAt: null, // Only update if not already opened
            },
            data: {
                status: 'OPENED',
                openedAt: new Date(),
            },
        });

        if (result.count > 0) {
            const recipient = await prisma.campaignRecipient.findUnique({
                where: { id: recipientId },
                select: { campaignId: true }
            });
            
            if (recipient) {
                await prisma.campaignStats.update({
                    where: { campaignId: recipient.campaignId },
                    data: { openedCount: { increment: 1 } }
                }).catch(err => console.error('Failed to update stats:', err));
            }
        }

        // Return a 1x1 transparent pixel
        const pixel = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64'
        );

        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': pixel.length,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
        res.end(pixel);
    } catch (error) {
        // Return pixel anyway, don't expose errors
        const pixel = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64'
        );
        res.writeHead(200, { 'Content-Type': 'image/gif' });
        res.end(pixel);
    }
};

export const trackClick = async (req, res) => {
    try {
        const { recipientId } = req.params;
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Update recipient status
        const result = await prisma.campaignRecipient.updateMany({
            where: {
                id: recipientId,
                clickedAt: null,
            },
            data: {
                status: 'CLICKED',
                clickedAt: new Date(),
            },
        });

        if (result.count > 0) {
            const recipient = await prisma.campaignRecipient.findUnique({
                where: { id: recipientId },
                select: { campaignId: true }
            });
            
            if (recipient) {
                await prisma.campaignStats.update({
                    where: { campaignId: recipient.campaignId },
                    data: { clickedCount: { increment: 1 } }
                }).catch(err => console.error('Failed to update stats:', err));
            }
        }

        // Record the click
        await prisma.linkClick.create({
            data: {
                recipientId,
                url: decodeURIComponent(url),
            },
        });

        // Redirect to the original URL
        res.redirect(decodeURIComponent(url));
    } catch (error) {
        console.error('Track click error:', error);

        // Redirect anyway
        if (req.query.url) {
            return res.redirect(decodeURIComponent(req.query.url));
        }

        res.status(400).send('Invalid tracking link');
    }
};

export const unsubscribe = async (req, res) => {
    try {
        const { recipientId } = req.params;

        const recipient = await prisma.campaignRecipient.findUnique({
            where: { id: recipientId },
            include: { contact: true },
        });

        if (!recipient) {
            return res.status(404).send('Recipient not found');
        }

        // Mark contact as unsubscribed
        await prisma.contact.update({
            where: { id: recipient.contactId },
            data: { status: 'UNSUBSCRIBED' },
        });

        // Update recipient status
        await prisma.campaignRecipient.update({
            where: { id: recipientId },
            data: { status: 'UNSUBSCRIBED' },
        });

        res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .message { max-width: 500px; margin: 0 auto; }
            h1 { color: #dc3545; }
          </style>
        </head>
        <body>
          <div class="message">
            <h1>You've been unsubscribed</h1>
            <p>You will no longer receive emails from us.</p>
          </div>
        </body>
      </html>
    `);
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).send('An error occurred');
    }
};

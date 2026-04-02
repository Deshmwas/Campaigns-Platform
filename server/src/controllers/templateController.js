import prisma from '../config/database.js';

export const getEmailTemplates = async (req, res, next) => {
    try {
        const templates = await prisma.emailTemplate.findMany({
            where: { organizationId: req.organizationId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(templates);
    } catch (error) {
        next(error);
    }
};

export const getEmailTemplate = async (req, res, next) => {
    try {
        const template = await prisma.emailTemplate.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
        });
        if (!template) return res.status(404).json({ error: 'Template not found' });
        res.json(template);
    } catch (error) {
        next(error);
    }
};

export const createEmailTemplate = async (req, res, next) => {
    try {
        const { name, subject, htmlContent, textContent, designJson } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Template name is required' });
        }
        if (!htmlContent && (!designJson || !Array.isArray(designJson))) {
            return res.status(400).json({ error: 'Template content is required' });
        }

        const template = await prisma.emailTemplate.create({
            data: {
                organizationId: req.organizationId,
                name: name.trim(),
                subject: subject || name.trim(),
                htmlContent: htmlContent || '',
                textContent: textContent || undefined,
                designJson: designJson || undefined,
            },
        });
        res.status(201).json(template);
    } catch (error) {
        next(error);
    }
};

export const updateEmailTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, subject, htmlContent, textContent, designJson } = req.body;

        // Verify the template exists and belongs to this org
        const existing = await prisma.emailTemplate.findFirst({
            where: { id, organizationId: req.organizationId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const template = await prisma.emailTemplate.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(subject && { subject }),
                ...(htmlContent && { htmlContent }),
                ...(textContent !== undefined && { textContent }),
                ...(designJson !== undefined && { designJson }),
            },
        });
        res.json(template);
    } catch (error) {
        next(error);
    }
};

export const duplicateEmailTemplate = async (req, res, next) => {
    try {
        const original = await prisma.emailTemplate.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
        });
        if (!original) return res.status(404).json({ error: 'Template not found' });

        const copy = await prisma.emailTemplate.create({
            data: {
                organizationId: req.organizationId,
                name: `${original.name} (Copy)`,
                subject: original.subject,
                htmlContent: original.htmlContent,
                textContent: original.textContent,
                designJson: original.designJson || undefined,
            },
        });
        res.status(201).json(copy);
    } catch (error) {
        next(error);
    }
};

export const deleteEmailTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify ownership before deleting
        const existing = await prisma.emailTemplate.findFirst({
            where: { id, organizationId: req.organizationId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Template not found' });
        }

        await prisma.emailTemplate.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// SMS Templates
export const getSmsTemplates = async (req, res, next) => {
    try {
        const templates = await prisma.smsTemplate.findMany({
            where: { organizationId: req.organizationId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(templates);
    } catch (error) {
        next(error);
    }
};

export const getSmsTemplate = async (req, res, next) => {
    try {
        const template = await prisma.smsTemplate.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
        });
        if (!template) return res.status(404).json({ error: 'Template not found' });
        res.json(template);
    } catch (error) {
        next(error);
    }
};

export const createSmsTemplate = async (req, res, next) => {
    try {
        const { name, content } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Template name is required' });
        }
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Template content is required' });
        }

        const template = await prisma.smsTemplate.create({
            data: {
                organizationId: req.organizationId,
                name: name.trim(),
                content: content.trim(),
            },
        });
        res.status(201).json(template);
    } catch (error) {
        next(error);
    }
};

export const updateSmsTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, content } = req.body;

        const existing = await prisma.smsTemplate.findFirst({
            where: { id, organizationId: req.organizationId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const template = await prisma.smsTemplate.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(content && { content: content.trim() }),
            },
        });
        res.json(template);
    } catch (error) {
        next(error);
    }
};

export const deleteSmsTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.smsTemplate.findFirst({
            where: { id, organizationId: req.organizationId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Template not found' });
        }

        await prisma.smsTemplate.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

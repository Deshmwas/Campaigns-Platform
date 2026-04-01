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
        const template = await prisma.emailTemplate.create({
            data: {
                organizationId: req.organizationId,
                name, subject, htmlContent, textContent,
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
        const template = await prisma.emailTemplate.update({
            where: { id, organizationId: req.organizationId },
            data: {
                ...(name && { name }), ...(subject && { subject }),
                ...(htmlContent && { htmlContent }), ...(textContent !== undefined && { textContent }),
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
        await prisma.emailTemplate.delete({
            where: { id, organizationId: req.organizationId },
        });
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

        const template = await prisma.smsTemplate.create({
            data: {
                organizationId: req.organizationId,
                name,
                content,
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

        const template = await prisma.smsTemplate.update({
            where: {
                id,
                organizationId: req.organizationId,
            },
            data: { name, content },
        });

        res.json(template);
    } catch (error) {
        next(error);
    }
};

export const deleteSmsTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;

        await prisma.smsTemplate.delete({
            where: {
                id,
                organizationId: req.organizationId,
            },
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

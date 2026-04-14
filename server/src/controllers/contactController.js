import prisma from '../config/database.js';

export const getContacts = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, status, listId, search } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {
            organizationId: req.organizationId,
            ...(status && { status }),
            ...(listId && {
                listMemberships: {
                    some: { listId },
                },
            }),
            ...(search && {
                OR: [
                    { email: { contains: search } },
                    { phone: { contains: search } },
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                ],
            }),
        };

        const [contacts, total] = await Promise.all([
            prisma.contact.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    listMemberships: {
                        include: { list: { select: { id: true, name: true } } },
                    },
                },
            }),
            prisma.contact.count({ where }),
        ]);

        res.json({
            contacts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / take),
            },
        });
    } catch (error) {
        next(error);
    }
};

export const createContact = async (req, res, next) => {
    try {
        const { email, phone, firstName, lastName, customData, tags, listIds = [] } = req.body;

        if (!email && !phone) {
            return res.status(400).json({ error: 'Email or phone is required' });
        }

        const contact = await prisma.contact.create({
            data: {
                organizationId: req.organizationId,
                email,
                phone,
                firstName,
                lastName,
                customData,
                tags,
                listMemberships: {
                    create: listIds.map(listId => ({ listId })),
                },
            },
            include: { listMemberships: { include: { list: true } } },
        });

        res.status(201).json(contact);
    } catch (error) {
        next(error);
    }
};

export const updateContact = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { email, phone, firstName, lastName, customData, tags, status } = req.body;

        const contact = await prisma.contact.update({
            where: {
                id,
                organizationId: req.organizationId,
            },
            data: {
                email,
                phone,
                firstName,
                lastName,
                customData,
                tags,
                status,
            },
        });

        res.json(contact);
    } catch (error) {
        next(error);
    }
};

export const deleteContact = async (req, res, next) => {
    try {
        const { id } = req.params;

        await prisma.contact.delete({
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

export const importContacts = async (req, res, next) => {
    try {
        const { contacts: contactsData, listId } = req.body;

        if (!contactsData || !Array.isArray(contactsData)) {
            return res.status(400).json({ error: 'Contacts array is required' });
        }

        let imported = 0;
        let skipped = 0;
        let failed = 0;
        const skippedDetails = [];
        const failedDetails = [];

        for (const data of contactsData) {
            if (!data.email && !data.phone) {
                failed++;
                failedDetails.push({ contact: data, error: 'Email or phone required' });
                continue;
            }

            try {
                // Check if contact already exists in this organization
                const existing = await prisma.contact.findFirst({
                    where: {
                        organizationId: req.organizationId,
                        OR: [
                            ...(data.email ? [{ email: data.email }] : []),
                            ...(data.phone ? [{ phone: data.phone }] : []),
                        ],
                    },
                });

                if (existing) {
                    skipped++;
                    skippedDetails.push({ email: data.email || data.phone, reason: 'Already exists' });
                    
                    // If listId provided, ensure they are in the list
                    if (listId) {
                        const membership = await prisma.listMembership.findFirst({
                            where: { contactId: existing.id, listId }
                        });
                        if (!membership) {
                            await prisma.listMembership.create({
                                data: { contactId: existing.id, listId }
                            });
                        }
                    }
                    continue;
                }

                await prisma.contact.create({
                    data: {
                        organizationId: req.organizationId,
                        email: data.email || null,
                        phone: data.phone || null,
                        firstName: data.firstName || null,
                        lastName: data.lastName || null,
                        customData: data.company ? { company: data.company } : {},
                        listMemberships: listId ? {
                            create: { listId },
                        } : undefined,
                    },
                });
                imported++;
            } catch (error) {
                failed++;
                failedDetails.push({ contact: data, error: error.message });
            }
        }

        res.json({
            imported,
            skipped,
            failed,
            skippedDetails,
            failedDetails,
        });
    } catch (error) {
        next(error);
    }
};

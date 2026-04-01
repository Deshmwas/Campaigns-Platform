import prisma from '../config/database.js';
import Papa from 'papaparse';

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
        const { csvData, listId } = req.body;

        if (!csvData) {
            return res.status(400).json({ error: 'CSV data is required' });
        }

        const parsed = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
        });

        const contacts = [];
        const errors = [];

        for (let i = 0; i < parsed.data.length; i++) {
            const row = parsed.data[i];

            if (!row.email && !row.phone) {
                errors.push({ row: i + 1, error: 'Email or phone required' });
                continue;
            }

            try {
                const contact = await prisma.contact.create({
                    data: {
                        organizationId: req.organizationId,
                        email: row.email || null,
                        phone: row.phone || null,
                        firstName: row.firstName || row.first_name || null,
                        lastName: row.lastName || row.last_name || null,
                        customData: row,
                        listMemberships: listId ? {
                            create: { listId },
                        } : undefined,
                    },
                });
                contacts.push(contact);
            } catch (error) {
                errors.push({ row: i + 1, error: error.message });
            }
        }

        res.json({
            imported: contacts.length,
            failed: errors.length,
            errors,
        });
    } catch (error) {
        next(error);
    }
};

import prisma from '../config/database.js';

export const getLists = async (req, res, next) => {
    try {
        const lists = await prisma.contactList.findMany({
            where: { organizationId: req.organizationId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { memberships: true } },
            },
        });

        res.json(lists);
    } catch (error) {
        next(error);
    }
};

export const createList = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        const list = await prisma.contactList.create({
            data: {
                organizationId: req.organizationId,
                name,
                description,
            },
        });

        res.status(201).json(list);
    } catch (error) {
        next(error);
    }
};

export const updateList = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const list = await prisma.contactList.update({
            where: {
                id,
                organizationId: req.organizationId,
            },
            data: { name, description },
        });

        res.json(list);
    } catch (error) {
        next(error);
    }
};

export const deleteList = async (req, res, next) => {
    try {
        const { id } = req.params;

        await prisma.contactList.delete({
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

export const addContactsToList = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { contactIds } = req.body;

        // Verify list belongs to organization
        const list = await prisma.contactList.findFirst({
            where: { id, organizationId: req.organizationId },
        });

        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }

        // Create memberships
        const memberships = await prisma.contactListMembership.createMany({
            data: contactIds.map(contactId => ({
                listId: id,
                contactId,
            })),
            skipDuplicates: true,
        });

        res.json({ added: memberships.count });
    } catch (error) {
        next(error);
    }
};

export const removeContactsFromList = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { contactIds } = req.body;

        const result = await prisma.contactListMembership.deleteMany({
            where: {
                listId: id,
                contactId: { in: contactIds },
            },
        });

        res.json({ removed: result.count });
    } catch (error) {
        next(error);
    }
};

export const mergeLists = async (req, res, next) => {
    try {
        const { targetListId } = req.params;
        const { sourceListIds } = req.body;

        if (!sourceListIds || !Array.isArray(sourceListIds) || sourceListIds.length === 0) {
            return res.status(400).json({ error: 'sourceListIds must be a non-empty array' });
        }

        // Verify target list exists and belongs to organization
        const targetList = await prisma.contactList.findFirst({
            where: { id: targetListId, organizationId: req.organizationId },
        });

        if (!targetList) {
            return res.status(404).json({ error: 'Target list not found' });
        }

        // 1. Get all contact IDs from source lists
        // distinct: ['contactId'] ensures we don't fetch duplicates if a contact is in multiple source lists
        const memberships = await prisma.contactListMembership.findMany({
            where: {
                listId: { in: sourceListIds },
                list: { organizationId: req.organizationId }, // Security check
            },
            select: { contactId: true },
            distinct: ['contactId'],
        });

        if (memberships.length === 0) {
            return res.json({ merged: 0, message: 'No contacts found in source lists' });
        }

        // 2. Prepare data for bulk insertion into target list
        const newMemberships = memberships.map(m => ({
            listId: targetListId,
            contactId: m.contactId,
        }));

        // 3. Insert into target list, skipping duplicates (contacts already in target)
        // detailed log: Merging ${newMemberships.length} contacts into list ${targetListId}
        const result = await prisma.contactListMembership.createMany({
            data: newMemberships,
            skipDuplicates: true,
        });

        res.json({
            merged: result.count,
            message: `Successfully merged unique contacts from ${sourceListIds.length} lists into target list.`,
        });
    } catch (error) {
        next(error);
    }
};

import multer from 'multer';

export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.message || err);

    // Multer file upload errors
    if (err instanceof multer.MulterError) {
        const messages = {
            LIMIT_FILE_SIZE: 'File is too large',
            LIMIT_FILE_COUNT: 'Too many files',
            LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
            LIMIT_FIELD_KEY: 'Field name too long',
            LIMIT_FIELD_VALUE: 'Field value too long',
            LIMIT_PART_COUNT: 'Too many form parts',
        };
        return res.status(400).json({
            error: messages[err.code] || `Upload error: ${err.message}`,
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.details,
        });
    }

    // Prisma unique constraint violation
    if (err.code === 'P2002') {
        return res.status(409).json({
            error: 'A record with this value already exists',
            field: err.meta?.target,
        });
    }

    // Prisma record not found
    if (err.code === 'P2025') {
        return res.status(404).json({
            error: 'Record not found',
        });
    }

    // Prisma foreign key constraint
    if (err.code === 'P2003') {
        return res.status(400).json({
            error: 'Cannot complete this operation due to related records',
        });
    }

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

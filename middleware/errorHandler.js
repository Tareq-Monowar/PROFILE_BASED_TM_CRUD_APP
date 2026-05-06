

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Set status code (default to 500)
    const status = err.status || 500;

    // Create error response
    const errorResponse = {
        message: err.message || 'An unexpected error occurred',
        status: status
    };

    // Add error details in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.details = err;
    }

    // Handle specific error types
    if (err.code === 'ER_DUP_ENTRY') {
        errorResponse.message = 'Duplicate entry: This email or username already exists';
        errorResponse.status = 409;
    } else if (err.code === 'ER_NO_REFERENCED_ROW') {
        errorResponse.message = 'Invalid reference: The referenced resource does not exist';
        errorResponse.status = 400;
    } else if (err.name === 'ValidationError') {
        errorResponse.message = err.message;
        errorResponse.status = 400;
    } else if (err.name === 'UnauthorizedError') {
        errorResponse.message = 'Unauthorized access';
        errorResponse.status = 401;
    } else if (err.name === 'ForbiddenError') {
        errorResponse.message = 'Access forbidden';
        errorResponse.status = 403;
    }

    res.status(errorResponse.status).json(errorResponse);
};

const notFoundHandler = (req, res) => {
    res.status(404).json({
        message: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
};

module.exports = {
    errorHandler,
    notFoundHandler
};

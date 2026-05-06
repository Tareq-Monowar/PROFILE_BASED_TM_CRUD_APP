

const validateJsonBody = (req, res, next) => {
    // Check if Content-Type is application/json
    if (req.method !== 'GET' && req.method !== 'DELETE') {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(415).json({
                message: 'Unsupported Media Type. Content-Type must be application/json'
            });
        }
    }
    next();
};

const validateRequestSize = (maxSize = '10mb') => {
    return (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'DELETE') {
            const size = parseInt(req.headers['content-length']) || 0;
            const maxBytes = maxSize === '10mb' ? 10485760 : parseInt(maxSize);
            
            if (size > maxBytes) {
                return res.status(413).json({
                    message: 'Payload Too Large. Maximum size is ' + maxSize
                });
            }
        }
        next();
    };
};

const sanitizeRequestBody = (allowedFields = []) => {
    return (req, res, next) => {
        if (typeof req.body !== 'object') {
            return next();
        }

        // If allowedFields is not specified, pass through
        if (allowedFields.length === 0) {
            return next();
        }

        // Filter body to only allowed fields
        const sanitized = {};
        allowedFields.forEach(field => {
            if (field in req.body) {
                sanitized[field] = req.body[field];
            }
        });

        req.body = sanitized;
        next();
    };
};

const validateQueryParams = (allowedParams = []) => {
    return (req, res, next) => {
        if (!req.query || Object.keys(req.query).length === 0) {
            return next();
        }

        for (const param of Object.keys(req.query)) {
            if (allowedParams.length > 0 && !allowedParams.includes(param)) {
                return res.status(400).json({
                    message: `Invalid query parameter: ${param}`,
                    allowedParameters: allowedParams
                });
            }
        }
        next();
    };
};

module.exports = {
    validateJsonBody,
    validateRequestSize,
    sanitizeRequestBody,
    validateQueryParams
};

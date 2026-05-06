

const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            message: "Unauthorized: No user information" 
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            message: "Forbidden: Admin access required" 
        });
    }

    next();
};

const isOwnerOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            message: "Unauthorized: No user information" 
        });
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
        return next();
    }

    // Regular user can only access their own resources
    const userId = parseInt(req.params.userId || req.query.userId);
    if (isNaN(userId)) {
        return res.status(400).json({ 
            message: "Invalid user ID" 
        });
    }

    if (req.user.id !== userId) {
        return res.status(403).json({ 
            message: "Forbidden: You can only access your own resources" 
        });
    }

    next();
};

const hasRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                message: "Unauthorized: No user information" 
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Forbidden: Required roles are ${roles.join(', ')}` 
            });
        }

        next();
    };
};

module.exports = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    };
};

module.exports.isAdmin = isAdmin;
module.exports.isOwnerOrAdmin = isOwnerOrAdmin;
module.exports.hasRole = hasRole;
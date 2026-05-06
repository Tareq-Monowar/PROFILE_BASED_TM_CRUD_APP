const router = require('express').Router();
const ctrl = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');
const { sanitizeRequestBody, validateQueryParams } = require('../middleware/validators');

// Public routes
router.post('/register', 
    sanitizeRequestBody(['username', 'email', 'password', 'confirmPassword']),
    ctrl.register
);

router.post('/login', 
    sanitizeRequestBody(['email', 'password']),
    ctrl.login
);

// Protected routes (require authentication)
router.get('/profile', 
    auth,
    ctrl.getProfile
);

router.put('/password-update',
    auth,
    sanitizeRequestBody(['currentPassword', 'newPassword', 'confirmPassword']),
    ctrl.updatePassword
);

module.exports = router;
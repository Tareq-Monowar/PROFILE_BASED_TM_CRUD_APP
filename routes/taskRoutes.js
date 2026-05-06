const router = require('express').Router();
const ctrl = require('../controllers/taskController');
const auth = require('../middleware/authMiddleware');
const { sanitizeRequestBody, validateQueryParams } = require('../middleware/validators');

// All task routes require authentication
router.use(auth);

// Create task
router.post('/', 
    sanitizeRequestBody(['title', 'description', 'status', 'priority']),
    ctrl.createTask
);

// Get all user tasks (with filtering and pagination)
router.get('/', 
    validateQueryParams(['status', 'priority', 'sort', 'page', 'limit']),
    ctrl.getTasks
);

// Get task statistics
router.get('/stats', 
    ctrl.getTaskStats
);

// Get single task by ID
router.get('/:id', 
    ctrl.getTaskById
);

// Update task
router.put('/:id', 
    sanitizeRequestBody(['title', 'description', 'status', 'priority']),
    ctrl.updateTask
);

// Delete task
router.delete('/:id', 
    ctrl.deleteTask
);

module.exports = router;
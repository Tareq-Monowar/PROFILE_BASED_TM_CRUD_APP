const db = require('../config/db');

// Validation helpers
const validateTaskTitle = (title) => {
    return title && title.trim().length > 0 && title.length <= 255;
};

const validateStatus = (status) => {
    const validStatuses = ['pending', 'in_progress', 'completed'];
    return validStatuses.includes(status);
};

const validatePriority = (priority) => {
    const validPriorities = ['low', 'medium', 'high'];
    return !priority || validPriorities.includes(priority);
};

// CREATE TASK
exports.createTask = async (req, res) => {
    const { title, description, status, priority } = req.body;

    try {
        // Input validation
        if (!title) {
            return res.status(400).json({ 
                message: "Task title is required" 
            });
        }

        if (!validateTaskTitle(title)) {
            return res.status(400).json({ 
                message: "Task title must be between 1 and 255 characters" 
            });
        }

        const taskStatus = status || 'pending';
        if (!validateStatus(taskStatus)) {
            return res.status(400).json({ 
                message: "Invalid status. Must be one of: pending, in_progress, completed" 
            });
        }

        const taskPriority = priority || 'medium';
        if (!validatePriority(taskPriority)) {
            return res.status(400).json({ 
                message: "Invalid priority. Must be one of: low, medium, high" 
            });
        }

        // Insert task
        const result = await db.query(
            'INSERT INTO tasks (user_id, title, description, status, priority) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, title.trim(), description || null, taskStatus, taskPriority]
        );

        res.status(201).json({ 
            message: "Task created successfully",
            taskId: result[0].insertId
        });
    } catch (err) {
        console.error('Create task error:', err);
        res.status(500).json({ 
            message: "Failed to create task",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// GET ALL USER TASKS (with filtering and pagination)
exports.getTasks = async (req, res) => {
    try {
        const { status, priority, sort, page = 1, limit = 10 } = req.query;
        let query = 'SELECT * FROM tasks WHERE user_id = ?';
        let params = [req.user.id];

        // Filter by status
        if (status) {
            if (!validateStatus(status)) {
                return res.status(400).json({ 
                    message: "Invalid status filter" 
                });
            }
            query += ' AND status = ?';
            params.push(status);
        }

        // Filter by priority
        if (priority) {
            if (!validatePriority(priority)) {
                return res.status(400).json({ 
                    message: "Invalid priority filter" 
                });
            }
            query += ' AND priority = ?';
            params.push(priority);
        }

        // Sort
        const validSortFields = ['created_at', 'updated_at', 'title', 'status', 'priority'];
        const sortField = validSortFields.includes(sort) ? sort : 'created_at';
        query += ` ORDER BY ${sortField} DESC`;

        // Pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;
        query += ' LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        // Execute query
        const [tasks] = await db.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM tasks WHERE user_id = ?';
        let countParams = [req.user.id];
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        if (priority) {
            countQuery += ' AND priority = ?';
            countParams.push(priority);
        }
        const [countResult] = await db.query(countQuery, countParams);

        res.json({
            message: "Tasks retrieved successfully",
            tasks: tasks,
            pagination: {
                total: countResult[0].total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(countResult[0].total / limitNum)
            }
        });
    } catch (err) {
        console.error('Get tasks error:', err);
        res.status(500).json({ 
            message: "Failed to retrieve tasks",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// GET SINGLE TASK
exports.getTaskById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                message: "Invalid task ID" 
            });
        }

        const [tasks] = await db.query(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({ 
                message: "Task not found" 
            });
        }

        res.json({
            message: "Task retrieved successfully",
            task: tasks[0]
        });
    } catch (err) {
        console.error('Get task by ID error:', err);
        res.status(500).json({ 
            message: "Failed to retrieve task",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// UPDATE TASK
exports.updateTask = async (req, res) => {
    const { id } = req.params;
    const { title, description, status, priority } = req.body;

    try {
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                message: "Invalid task ID" 
            });
        }

        // Check if task exists and belongs to user
        const [tasks] = await db.query(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({ 
                message: "Task not found" 
            });
        }

        // Validate input
        const updateData = {};
        if (title !== undefined) {
            if (!validateTaskTitle(title)) {
                return res.status(400).json({ 
                    message: "Task title must be between 1 and 255 characters" 
                });
            }
            updateData.title = title.trim();
        }

        if (description !== undefined) {
            updateData.description = description;
        }

        if (status !== undefined) {
            if (!validateStatus(status)) {
                return res.status(400).json({ 
                    message: "Invalid status. Must be one of: pending, in_progress, completed" 
                });
            }
            updateData.status = status;
        }

        if (priority !== undefined) {
            if (!validatePriority(priority)) {
                return res.status(400).json({ 
                    message: "Invalid priority. Must be one of: low, medium, high" 
                });
            }
            updateData.priority = priority;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ 
                message: "No fields to update" 
            });
        }

        // Build dynamic update query
        const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const updateValues = Object.values(updateData);

        await db.query(
            `UPDATE tasks SET ${updateFields} WHERE id = ? AND user_id = ?`,
            [...updateValues, id, req.user.id]
        );

        res.json({ 
            message: "Task updated successfully" 
        });
    } catch (err) {
        console.error('Update task error:', err);
        res.status(500).json({ 
            message: "Failed to update task",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// DELETE TASK
exports.deleteTask = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                message: "Invalid task ID" 
            });
        }

        // Check if task exists and belongs to user
        const [tasks] = await db.query(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({ 
                message: "Task not found" 
            });
        }

        // Delete task
        await db.query(
            'DELETE FROM tasks WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        res.json({ 
            message: "Task deleted successfully" 
        });
    } catch (err) {
        console.error('Delete task error:', err);
        res.status(500).json({ 
            message: "Failed to delete task",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// GET TASK STATISTICS (admin only)
exports.getTaskStats = async (req, res) => {
    try {
        const [stats] = await db.query(
            `SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
                SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority_tasks
            FROM tasks WHERE user_id = ?`,
            [req.user.id]
        );

        res.json({
            message: "Task statistics retrieved successfully",
            statistics: stats[0]
        });
    } catch (err) {
        console.error('Get task stats error:', err);
        res.status(500).json({ 
            message: "Failed to retrieve task statistics",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};
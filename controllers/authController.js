const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

// Validation helpers
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    // Password must be at least 8 characters
    return password && password.length >= 8;
};

const validateUsername = (username) => {
    // Username must be 3-50 characters, alphanumeric and underscore
    return /^[a-zA-Z0-9_]{3,50}$/.test(username);
};

// REGISTER
exports.register = async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    try {
        // Input validation
        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({ 
                message: "All fields are required" 
            });
        }

        if (!validateUsername(username)) {
            return res.status(400).json({ 
                message: "Username must be 3-50 characters, alphanumeric and underscore only" 
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ 
                message: "Invalid email format" 
            });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ 
                message: "Password must be at least 8 characters" 
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ 
                message: "Passwords do not match" 
            });
        }

        // Check if user already exists
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ 
                message: "Email or username already exists" 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        await db.query(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, 'user']
        );

        res.status(201).json({ 
            message: "User registered successfully",
            username: username,
            email: email
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ 
            message: "Registration failed",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// LOGIN
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Input validation
        if (!email || !password) {
            return res.status(400).json({ 
                message: "Email and password are required" 
            });
        }

        // Find user
        const [users] = await db.query(
            'SELECT id, username, email, password, role, is_active FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                message: "Invalid email or password" 
            });
        }

        const user = users[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({ 
                message: "User account is inactive" 
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                message: "Invalid email or password" 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email,
                username: user.username,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ 
            message: "Login successful",
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            message: "Login failed",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// GET USER PROFILE
exports.getProfile = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, username, email, role, is_active, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                message: "User not found" 
            });
        }

        res.json({
            message: "Profile retrieved successfully",
            user: users[0]
        });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ 
            message: "Failed to retrieve profile",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// UPDATE PASSWORD
exports.updatePassword = async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    try {
        // Input validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ 
                message: "All fields are required" 
            });
        }

        if (!validatePassword(newPassword)) {
            return res.status(400).json({ 
                message: "New password must be at least 8 characters" 
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ 
                message: "New passwords do not match" 
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ 
                message: "New password must be different from current password" 
            });
        }

        // Get current user
        const [users] = await db.query(
            'SELECT password FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                message: "User not found" 
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ 
                message: "Current password is incorrect" 
            });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedNewPassword, req.user.id]
        );

        res.json({ 
            message: "Password updated successfully" 
        });
    } catch (err) {
        console.error('Update password error:', err);
        res.status(500).json({ 
            message: "Failed to update password",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};
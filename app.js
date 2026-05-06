const express = require('express');
const app = express();
require('dotenv').config();

const { validateJsonBody, validateRequestSize } = require('./middleware/validators');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');


app.use(express.json());
app.use(validateJsonBody);
app.use(validateRequestSize('10mb'));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.use('/auth', require('./routes/authRoutes'));
app.use('/tasks', require('./routes/taskRoutes'));

app.get('/health', (req, res) => {
    res.json({ 
        message: "Task Manager API is running",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.use(notFoundHandler);

app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
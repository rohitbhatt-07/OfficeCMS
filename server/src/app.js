const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// General rate limit for the whole API
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false }));

// API Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/records', require('./routes/records.routes'));
app.use('/api/departments', require('./routes/departments.routes'));
app.use('/api/categories', require('./routes/categories.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/stats', require('./routes/stats.routes'));
app.use('/api/audit', require('./routes/audit.routes'));

app.use('/api', notFound);

// In production, serve the built React app from the same server.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;

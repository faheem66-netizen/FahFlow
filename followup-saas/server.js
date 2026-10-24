require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
require('./config/firebaseAdmin'); // initializes Firebase Admin app
const monitoringService = require('./services/monitoringService');

const authRoutes = require('./routes/auth.routes');
const gmailRoutes = require('./routes/gmail.routes');
const threadRoutes = require('./routes/threads.routes');

const app = express();

app.use(helmet());

// Ensure MongoDB is connected on every serverless invocation
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Robust CORS configuration
const allowedClientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : 'https://fah-flowllc.vercel.app';
app.use(cors({
  origin: [allowedClientUrl, 'https://fah-flowllc.vercel.app', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Health Check & Root Routes
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.send('FahFlow Backend Running Successfully!'));

// Direct Routes (Matching Frontend Calls)
app.use('/auth', authRoutes);
app.use('/gmail', gmailRoutes);
app.use('/threads', threadRoutes);

// Fallback Prefix Routes (For /api requests)
app.use('/api/auth', authRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/threads', threadRoutes);

// Central Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
});

// Start Monitoring in non-serverless or local environment
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`[server] listening on port ${PORT}`));
}

// Export Express app for Vercel Serverless Function deployment
module.exports = app;
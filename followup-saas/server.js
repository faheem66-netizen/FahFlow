require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
require('./config/firebaseAdmin'); // initializes the Firebase Admin app
const monitoringService = require('./services/monitoringService');

const authRoutes = require('./routes/auth.routes');
const gmailRoutes = require('./routes/gmail.routes');
const threadRoutes = require('./routes/threads.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// Health Check & Root Routes
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.send('FahFlow Backend Running Successfully!'));

app.use('/api/auth', authRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/threads', threadRoutes);

// Central error handler — keeps stack traces out of API responses in prod.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
});

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  monitoringService.start();
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => console.log(`[server] listening on port ${PORT}`));
  }
})();

module.exports = app;
